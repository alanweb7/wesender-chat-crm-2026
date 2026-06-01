// @ts-nocheck
import * as Sentry from "@sentry/node";
import BullQueue from "bull";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import Whatsapp from "./models/Whatsapp";
import logger from "./utils/logger";
import moment from "moment";
import Schedule from "./models/Schedule";
import { Op, QueryTypes, Sequelize } from "sequelize";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import Campaign from "./models/Campaign";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import Contact from "./models/Contact";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import ContactTag from "./models/ContactTag";
import Message from "./models/Message";
import Queue from "./models/Queue";
import Queues from "./models/Queue";
import Tag from "./models/Tag";
import Ticket from "./models/Ticket";
import TicketTag from "./models/TicketTag";
import User from "./models/User";
import { getWbot } from "./libs/wbot";
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import sequelize from "./database";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { getIO } from "./libs/socket";
import path from "path";
import { isEmpty, isNil, isArray } from "lodash";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import Ticket from "./models/Ticket";
import ShowContactService from "./services/ContactServices/ShowContactService";
import UserQueue from "./models/UserQueue";
import ShowTicketService from "./services/TicketServices/ShowTicketService";
import SendWhatsAppMessage from "./services/WbotServices/SendWhatsAppMessage";
import UpdateTicketService from "./services/TicketServices/UpdateTicketService";
import { addSeconds, differenceInSeconds } from "date-fns";
import { GetWhatsapp } from "./helpers/GetWhatsapp";
import Company from "./models/Company";
const CronJob = require('cron').CronJob;
import CompaniesSettings from "./models/CompaniesSettings";
import { verifyMediaMessage, verifyMessage } from "./services/WbotServices/wbotMessageListener";
import FindOrCreateTicketService from "./services/TicketServices/FindOrCreateTicketService";
import CreateLogTicketService from "./services/TicketServices/CreateLogTicketService";
import formatBody from "./helpers/Mustache";
import TicketTag from "./models/TicketTag";
import Tag from "./models/Tag";
import { delay } from "@whiskeysockets/baileys";
import Plan from "./models/Plan";
import runAutomationJob, {
  runBirthdayAutomationJob,
  runKanbanAutomationJob,
  runNoResponseAutomationJob,
  runAllAutomationsJob
} from "./services/AutomationServices/ExecuteAutomationsJob";
import runScheduledDispatchers from "./services/ScheduledDispatcherService/DispatchSchedulerService";
import startDispatchProcessor from "./services/ScheduledDispatcherService/DispatchProcessorService";
import { processGoogleMapsScrapeQueue } from "./queues/googleMapsScrapeQueue";
import GoogleMapsPlacesService from "./services/ContactServices/GoogleMapsPlacesService";
import GoogleMapsScrapeService from "./services/ContactServices/GoogleMapsScrapeService";
import { runCleanLidContacts } from "./services/ContactServices/CleanLidContactsRunner";
import { buildGraphClient } from "./services/WhatsappCoexistence/graphApiHelper";

const connection = process.env.REDIS_URI || "";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface CampaignSettings {
  messageInterval: number;
  longerIntervalAfter: number;
  greaterInterval: number;
  variables: any[];
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

export const userMonitor = new BullQueue("UserMonitor", connection);
export const scheduleMonitor = new BullQueue("ScheduleMonitor", connection);
export const sendScheduledMessages = new BullQueue("SendScheduledMessages", connection);
export const campaignQueue = new BullQueue("CampaignQueue", connection);
export const queueMonitor = new BullQueue("QueueMonitor", connection);

export const messageQueue = new BullQueue("MessageQueue", connection, {
  limiter: {
    max: limiterMax as number,
    duration: limiterDuration as number
  }
});

let isProcessing = false;

async function handleSendMessage(job) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp === null) {
      throw Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;

    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifySchedules(job) {
  try {
    logger.info(`[SendScheduledMessage -> Verify] Buscando schedules pendentes...`);
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.lte]: moment().toDate() // Buscar lembretes que já passaram ou estão na hora
        }
      },
      include: [
        { model: Contact, as: "contact", required: false },
        { model: User, as: "user", attributes: ["name"], required: false }
      ],
      distinct: true,
      subQuery: false
    });
    logger.info(`[SendScheduledMessage -> Verify] Encontrados ${count} agendamentos para processar`);

    if (count > 0) {
      logger.info(`Encontrados ${count} agendamentos para processar`);
      
      const promises = schedules.map(async schedule => {
        try {
          await schedule.update({
            status: "AGENDADA"
          });
          
          // Calcular delay baseado no tempo restante
          const now = moment();
          const sendAt = moment(schedule.sendAt);
          const delay = Math.max(0, sendAt.diff(now, "milliseconds")); // 0 para lembretes que já passaram
          
          sendScheduledMessages.add(
            "SendMessage",
            { schedule },
            { delay: delay } // Usar delay calculado em vez de 40 segundos fixos
          );
          const contactName = schedule.contact?.name || `ID: ${schedule.contactId || 'N/A'}`;
          logger.info(`[SendScheduledMessage] Job adicionado à fila para: ${contactName} em ${delay}ms`);
          logger.info(`Disparo agendado para: ${contactName} em ${delay}ms`);
        } catch (err) {
          const contactName = schedule.contact?.name || `ID: ${schedule.contactId || 'N/A'}`;
          logger.error(`Erro ao agendar disparo para ${contactName}: ${err.message}`);
          // Atualizar status para não tentar novamente
          await schedule.update({ status: "ERRO" });
        }
      });
      
      await Promise.all(promises);
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    logger.error("SendScheduledMessage -> Verify: error stack", e.stack);
    logger.error("SendScheduledMessage -> Verify: error name", e.name);
    logger.error("SendScheduledMessage -> Verify: error details", JSON.stringify(e));
    // Não throw para não parar o processamento
  }
}

async function handleSendScheduledMessage(job) {
  logger.info(`[SendScheduledMessage] Iniciando envio de mensagem agendada...`);
  const {
    data: { schedule }
  } = job;
  
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
  }

  // Verificar se há contato associado
  if (!schedule.contact || !schedule.contact.id) {
    logger.error(`[SendScheduledMessage] Schedule ${schedule.id} não tem contato associado. Marcando como ERRO.`);
    if (scheduleRecord) {
      await scheduleRecord.update({
        status: "ERRO"
      });
    }
    return;
  }

  try {
    let whatsapp

    if (!isNil(schedule.whatsappId)) {
      whatsapp = await Whatsapp.findByPk(schedule.whatsappId);
    }

    if (!whatsapp)
      whatsapp = await GetDefaultWhatsApp(null, schedule.companyId);

    // const settings = await CompaniesSettings.findOne({
    //   where: {
    //     companyId: schedule.companyId
    //   }
    // })

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", `company${schedule.companyId}`, schedule.mediaPath);
    }

    if (schedule.openTicket === "enabled") {
      // Reaproveita ticket existente do contato sempre que possível
      let ticket = await Ticket.findOne({
        where: {
          contactId: schedule.contact.id,
          companyId: schedule.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      });

      if (!ticket) {
        ticket = await Ticket.findOne({
          where: {
            contactId: schedule.contact.id,
            companyId: schedule.companyId,
            whatsappId: whatsapp.id
          },
          order: [["updatedAt", "DESC"]]
        });

        if (ticket) {
          await ticket.update({
            queueId: schedule.queueId,
            userId: schedule.ticketUserId,
            status: schedule.statusTicket
          });
        }
      }

      if (!ticket) {
        ticket = await Ticket.create({
          companyId: schedule.companyId,
          contactId: schedule.contactId,
          whatsappId: whatsapp.id,
          queueId: schedule.queueId,
          userId: schedule.ticketUserId,
          status: schedule.statusTicket
        });
      }

      ticket = await ShowTicketService(ticket.id, schedule.companyId);

      let bodyMessage;

      // @ts-ignore: Unreachable code error
      if (schedule.assinar && !isNil(schedule.userId)) {
        bodyMessage = `*${schedule?.user?.name}:*\n${schedule.body.trim()}`
      } else {
        bodyMessage = schedule.body.trim();
      }
      
      logger.info(`[SendScheduledMessage] Enviando mensagem COM ticket - Ticket: ${ticket.id}, Número: ${schedule.contact.number}, WhatsApp: ${whatsapp.id}`);

      // Verificar se tem arrayOption (menu de opções)
      if (schedule.arrayOption && schedule.arrayOption.length > 0) {
        try {
          const { SendMenuWithFallback } = await import("./helpers/SendInteractiveMenu");
          
          await SendMenuWithFallback({
            ticket: ticket,
            menuMessage: formatBody(bodyMessage, ticket),
            arrayOption: schedule.arrayOption,
            menuType: "buttons"
          });
          
          logger.info(`[SendScheduledMessage] Mensagem com menu enviada usando SendInteractiveMenu`);
        } catch (error) {
          logger.error(`[SendScheduledMessage] Erro ao enviar menu interativo, usando fallback: ${error.message}`);
          // Fallback para envio normal sem botões
          const sentMessage = await SendMessage(whatsapp, {
            number: schedule.contact.number,
            body: `\u200e ${formatBody(bodyMessage, ticket)}`,
            mediaPath: filePath,
            companyId: schedule.companyId
          },
            schedule.contact.isGroup
          );
          logger.info(`[SendScheduledMessage] Mensagem enviada (fallback sem botões) - ID: ${sentMessage?.id || 'N/A'}, Key: ${sentMessage?.key?.id || 'N/A'}`);

          if (schedule.mediaPath) {
            await verifyMediaMessage(sentMessage, ticket, ticket.contact, null, true, false, whatsapp);
          } else {
            await verifyMessage(sentMessage, ticket, ticket.contact, null, true, false);
          }
        }
      } else {
        // Enviar mensagem normal (sem menu)
        const sentMessage = await SendMessage(whatsapp, {
          number: schedule.contact.number,
          body: `\u200e ${formatBody(bodyMessage, ticket)}`,
          mediaPath: filePath,
          companyId: schedule.companyId
        },
          schedule.contact.isGroup
        );
        logger.info(`[SendScheduledMessage] Mensagem enviada - ID: ${sentMessage?.id || 'N/A'}, Key: ${sentMessage?.key?.id || 'N/A'}`);

        if (schedule.mediaPath) {
          await verifyMediaMessage(sentMessage, ticket, ticket.contact, null, true, false, whatsapp);
        } else {
          await verifyMessage(sentMessage, ticket, ticket.contact, null, true, false);
        }
      }
      // if (ticket) {
      //   await UpdateTicketService({
      //     ticketData: {
      //       sendFarewellMessage: false,
      //       status: schedule.statusTicket,
      //       userId: schedule.ticketUserId || null,
      //       queueId: schedule.queueId || null
      //     },
      //     ticketId: ticket.id,
      //     companyId: ticket.companyId
      //   })
      // }
    } else {
      logger.info(`[SendScheduledMessage] Enviando mensagem sem ticket - Número: ${schedule.contact.number}, WhatsApp: ${whatsapp.id}, Corpo: ${schedule.body.substring(0, 50)}...`);
      
      // Verificar se tem arrayOption (menu de opções)
      if (schedule.arrayOption && schedule.arrayOption.length > 0) {
        try {
          const wbot = await GetWhatsappWbot(whatsapp);
          const jid = `${schedule.contact.number}@${schedule.contact.isGroup ? 'g.us' : 's.whatsapp.net'}`;

          // Validar número de opções (máximo 3 para quick_reply)
          if (schedule.arrayOption.length > 3) {
            logger.warn(`[SendScheduledMessage] Menu com ${schedule.arrayOption.length} opções excede o limite de 3, usando fallback textual`);
            throw new Error("Too many options for interactive menu");
          }

          // Converter arrayOption em botões quick_reply
          const buttons = schedule.arrayOption.map((option, index) => ({
            name: "quick_reply" as const,
            buttonParamsJson: JSON.stringify({
              display_text: option.value.trim(),
              id: option.number.toString()
            })
          }));

          // Montar mensagem interativa com viewOnceMessage (padrão do projeto)
          const interactiveMsg = {
            viewOnceMessage: {
              message: {
                interactiveMessage: {
                  body: {
                    text: `\u200e${schedule.body.trim()}`
                  },
                  nativeFlowMessage: {
                    buttons: buttons,
                    messageParamsJson: JSON.stringify({
                      from: "apiv2",
                      templateId: "4194019344155670"
                    })
                  }
                }
              }
            }
          };

          // Gerar e enviar mensagem
          const newMsg = generateWAMessageFromContent(jid, interactiveMsg, {
            userJid: wbot.user.id
          }) as any;

          // additionalNodes para renderização consistente (regra OBRIGATÓRIA do manual)
          const additionalNodes = [
            {
              tag: "biz",
              attrs: {},
              content: [
                {
                  tag: "interactive",
                  attrs: { type: "native_flow", v: "1" },
                  content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
                }
              ]
            }
          ];

          await wbot.relayMessage(jid, newMsg.message!, {
            messageId: newMsg.key.id,
            additionalNodes
          });

          if (newMsg) {
            await wbot.upsertMessage(newMsg, "notify");
          }

          logger.info(`[SendScheduledMessage] Mensagem com menu enviada (sem ticket) usando interactiveMessage`);
        } catch (error) {
          logger.error(`[SendScheduledMessage] Erro ao enviar menu interativo sem ticket, usando fallback: ${error.message}`);
          // Fallback para envio normal sem botões
          const sentMessage = await SendMessage(whatsapp, {
            number: schedule.contact.number,
            body: `\u200e ${schedule.body}`,
            mediaPath: filePath,
            companyId: schedule.companyId
          },
            schedule.contact.isGroup);
          logger.info(`[SendScheduledMessage] Mensagem enviada (fallback sem botões) - ID: ${sentMessage?.id || 'N/A'}, Status: ${sentMessage?.status || 'N/A'}`);
        }
      } else {
        // Enviar mensagem normal (sem menu)
        const sentMessage = await SendMessage(whatsapp, {
          number: schedule.contact.number,
          body: `\u200e ${schedule.body}`,
          mediaPath: filePath,
          companyId: schedule.companyId
        },
          schedule.contact.isGroup);
        logger.info(`[SendScheduledMessage] Mensagem enviada - ID: ${sentMessage?.id || 'N/A'}, Status: ${sentMessage?.status || 'N/A'}`);
      }
    }

    if (schedule.valorIntervalo > 0 && (isNil(schedule.contadorEnvio) || schedule.contadorEnvio < schedule.enviarQuantasVezes)) {
      let unidadeIntervalo;
      switch (schedule.intervalo) {
        case 1:
          unidadeIntervalo = 'days';
          break;
        case 2:
          unidadeIntervalo = 'weeks';
          break;
        case 3:
          unidadeIntervalo = 'months';
          break;
        case 4:
          unidadeIntervalo = 'minuts';
          break;
        default:
          throw new Error('Intervalo inválido');
      }

      function isDiaUtil(date) {
        const dayOfWeek = date.day();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 é segunda-feira, 5 é sexta-feira
      }

      function proximoDiaUtil(date) {
        let proximoDia = date.clone();
        do {
          proximoDia.add(1, 'day');
        } while (!isDiaUtil(proximoDia));
        return proximoDia;
      }

      // Função para encontrar o dia útil anterior
      function diaUtilAnterior(date) {
        let diaAnterior = date.clone();
        do {
          diaAnterior.subtract(1, 'day');
        } while (!isDiaUtil(diaAnterior));
        return diaAnterior;
      }

      const dataExistente = new Date(schedule.sendAt);
      const hora = dataExistente.getHours();
      const fusoHorario = dataExistente.getTimezoneOffset();

      // Realizar a soma da data com base no intervalo e valor do intervalo
      let novaData = new Date(dataExistente); // Clone da data existente para não modificar a original

      console.log(unidadeIntervalo)
      if (unidadeIntervalo !== "minuts") {
        novaData.setDate(novaData.getDate() + schedule.valorIntervalo * (unidadeIntervalo === 'days' ? 1 : unidadeIntervalo === 'weeks' ? 7 : 30));
      } else {
        novaData.setMinutes(novaData.getMinutes() + Number(schedule.valorIntervalo));
        console.log(novaData)
      }

      if (schedule.tipoDias === 5 && !isDiaUtil(novaData)) {
        novaData = diaUtilAnterior(novaData);
      } else if (schedule.tipoDias === 6 && !isDiaUtil(novaData)) {
        novaData = proximoDiaUtil(novaData);
      }

      novaData.setHours(hora);
      novaData.setMinutes(novaData.getMinutes() - fusoHorario);

      await scheduleRecord?.update({
        status: "PENDENTE",
        contadorEnvio: schedule.contadorEnvio + 1,
        sendAt: new Date(novaData.toISOString().slice(0, 19).replace('T', ' ')) // Mantendo o formato de hora
      });
    } else {
      await scheduleRecord?.update({
        sentAt: new Date(moment().format("YYYY-MM-DD HH:mm")),
        status: "ENVIADA"
      });
    }

    // Recarregar com associações e emitir socket
    if (scheduleRecord) {
      const updatedSchedule = await Schedule.findByPk(scheduleRecord.id, {
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" }
        ]
      });
      logger.info(`[SendScheduledMessage] Schedule ${scheduleRecord.id} status: ${updatedSchedule?.status} - Emitindo socket company${schedule.companyId}-schedule`);
      if (updatedSchedule) {
        const io = getIO();
        const eventName = `company${schedule.companyId}-schedule`;
        logger.info(`[SendScheduledMessage] Emitindo evento: ${eventName} action=update id=${updatedSchedule.id} status=${updatedSchedule.status}`);
        io.of(String(schedule.companyId))
          .emit(eventName, {
            action: "update",
            schedule: updatedSchedule
          });
      }
    }

    // Verificar se deve iniciar fluxo após enviar mensagem
    if (schedule.tagIds && typeof schedule.tagIds === 'object' && schedule.tagIds.startFlow && schedule.tagIds.flowId) {
      try {
        logger.info(`[SendScheduledMessage] Iniciando fluxo ${schedule.tagIds.flowId} após envio da mensagem`);
        
        // Simular ação de startFlow
        const action = {
          type: "startFlow",
          flowId: schedule.tagIds.flowId.toString()
        };
        
        // Buscar ticket e contato
        const ticket = await Ticket.findByPk(schedule.ticketId);
        const contact = await Contact.findByPk(schedule.contactId);
        
        if (ticket && contact) {
          const { executeStartFlow } = await import("./services/ExecuteTagAutoActionsService");
          await executeStartFlow(action, contact, ticket, schedule.companyId);
          logger.info(`[SendScheduledMessage] Fluxo iniciado com sucesso`);
        } else {
          logger.error(`[SendScheduledMessage] Não foi possível iniciar fluxo - Ticket ou Contact não encontrado`);
        }
      } catch (error: any) {
        logger.error(`[SendScheduledMessage] Erro ao iniciar fluxo após mensagem: ${error.message}`);
      }
    }

    logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
    sendScheduledMessages.clean(15000, "completed");
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      status: "ERRO"
    });
    
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    
    // Emitir evento socket para atualizar frontend (erro)
    if (schedule?.companyId && scheduleRecord) {
      const updatedSchedule = await Schedule.findByPk(scheduleRecord.id, {
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" }
        ]
      });
      if (updatedSchedule) {
        const io = getIO();
        io.of(String(schedule.companyId))
          .emit(`company${schedule.companyId}-schedule`, {
            action: "update",
            schedule: updatedSchedule
          });
      }
    }
    
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    // Não throw para não travar a fila
  }
}

async function handleVerifyCampaigns(job) {
  if (isProcessing) {
    // logger.warn('A campaign verification process is already running.');
    return;
  }

  isProcessing = true;
  try {
    await new Promise(r => setTimeout(r, 1500));

    const campaigns: { id: number; scheduledAt: string }[] =
      await sequelize.query(
        `SELECT id, "scheduledAt" FROM "Campaigns" c
        WHERE "scheduledAt" BETWEEN NOW() AND NOW() + INTERVAL '3 hour' AND status = 'PROGRAMADA'`,
        { type: QueryTypes.SELECT }
      );

    if (campaigns.length > 0) {
      logger.info(`Campanhas encontradas: ${campaigns.length}`);

      const promises = campaigns.map(async (campaign) => {
        try {
          await sequelize.query(
            `UPDATE "Campaigns" SET status = 'EM_ANDAMENTO' WHERE id = ${campaign.id}`
          );

          const now = moment();
          const scheduledAt = moment(campaign.scheduledAt);
          const delay = scheduledAt.diff(now, "milliseconds");
          logger.info(
            `Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`
          );

          return campaignQueue.add(
            "ProcessCampaign",
            { id: campaign.id, delay },
            { priority: 3, removeOnComplete: { age: 60 * 60, count: 10 }, removeOnFail: { age: 60 * 60, count: 10 } }
          );

        } catch (err) {
          Sentry.captureException(err);
        }
      });

      await Promise.all(promises);

      logger.info('Todas as campanhas foram processadas e adicionadas à fila.');
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error processing campaigns: ${err.message}`);
  } finally {
    isProcessing = false;
  }
}


async function getCampaign(id) {
  const campaign = await Campaign.findByPk(id);

  const include: any[] = [
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["id", "name", "channel", "coexistencePhoneNumberId", "coexistencePermanentToken"]
    }
  ];

  // Incluir ContactList apenas quando for campanha por lista
  if (campaign?.contactListId) {
    include.push({
      model: ContactList,
      as: "contactList",
      attributes: ["id", "name"],
      include: [
        {
          model: ContactListItem,
          as: "contacts",
          attributes: ["id", "name", "number", "email", "isWhatsappValid", "isGroup"],
          where: { isWhatsappValid: true }
        }
      ]
    });
  }

  return await Campaign.findOne({
    where: { id },
    include
  });
}

async function getContact(id, isTagCampaign = false) {
  if (isTagCampaign) {
    return await Contact.findByPk(id, {
      attributes: ["id", "name", "number", "email", "isGroup"]
    });
  }
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email", "isGroup"]
  });
}

async function getSettings(campaign): Promise<CampaignSettings> {
  try {
    const settings = await CampaignSetting.findAll({
      where: { companyId: campaign.companyId },
      attributes: ["key", "value"]
    });

    let messageInterval: number = 20;
    let longerIntervalAfter: number = 20;
    let greaterInterval: number = 60;
    let variables: any[] = [];

    settings.forEach(setting => {
      if (setting.key === "messageInterval") {
        messageInterval = JSON.parse(setting.value);
      }
      if (setting.key === "longerIntervalAfter") {
        longerIntervalAfter = JSON.parse(setting.value);
      }
      if (setting.key === "greaterInterval") {
        greaterInterval = JSON.parse(setting.value);
      }
      if (setting.key === "variables") {
        variables = JSON.parse(setting.value);
      }
    });

    return {
      messageInterval,
      longerIntervalAfter,
      greaterInterval,
      variables
    };

  } catch (error) {
    console.log(error);
    throw error; // rejeita a Promise com o erro original
  }
}

export function parseToMilliseconds(seconds) {
  return seconds * 1000;
}

async function sleep(seconds) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

async function sendCampaignTemplateBlocks(wbot, chatId, campaign, message, ticket?, contact?, variables: any[] = []) {
  const publicFolder = path.resolve(__dirname, "..", "public");
  const blocks: any[] = campaign.templateData;

  for (const block of blocks) {
    const text = block.text ? getProcessedMessage(block.text, variables, contact || {}) : "";
    const caption = block.caption ? getProcessedMessage(block.caption, variables, contact || {}) : "";

    if (block.type === "text") {
      if (!text) continue;
      const body = `‌ ${text}`;
      if (ticket && contact) {
        const sent = await wbot.sendMessage(chatId, { text: body });
        await verifyMessage(sent, ticket, contact, null, true, false);
      } else {
        await wbot.sendMessage(chatId, { text: body });
      }
    } else if (block.type === "image" || block.type === "video" || block.type === "file") {
      if (!block.mediaPath) continue;
      const filePath = path.join(publicFolder, `company${campaign.companyId}`, block.mediaPath);
      const options = await getMessageOptions(block.mediaName || block.mediaPath, filePath, String(campaign.companyId), caption || `‌ ${message}`);
      if (Object.keys(options).length) {
        if (ticket && contact) {
          const sent = await wbot.sendMessage(chatId, { ...options });
          await verifyMediaMessage(sent, ticket, ticket.contact, null, false, true, wbot);
        } else {
          await wbot.sendMessage(chatId, { ...options });
        }
      }
    } else if (block.type === "buttons") {
      const buttons = (block.buttons || []).map((btn, btnIdx) => {
        let params: any;
        if (btn.type === "quick_reply") {
          params = { display_text: btn.displayText, id: String(btnIdx + 1) };
        } else if (btn.type === "cta_url") {
          params = { display_text: btn.displayText, url: btn.value, merchant_url: btn.value };
        } else if (btn.type === "cta_call") {
          params = { display_text: btn.displayText, phone_number: btn.value };
        } else {
          params = { display_text: btn.displayText, copy_code: btn.value };
        }
        return { name: btn.type, buttonParamsJson: JSON.stringify(params) };
      });
      if (!buttons.length) continue;
      const bodyText = text || `‌ ${message}`;
      const msg = generateWAMessageFromContent(
        chatId,
        {
          interactiveMessage: {
            body: { text: bodyText },
            footer: { text: "" },
            header: {},
            nativeFlowMessage: {
              buttons,
              messageParamsJson: JSON.stringify({ from: "apiv2", templateId: "4194019344155670" })
            }
          }
        },
        { userJid: wbot.user?.id }
      );
      await wbot.relayMessage(chatId, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
          {
            tag: "biz",
            attrs: {},
            content: [
              {
                tag: "interactive",
                attrs: { type: "native_flow", v: "1" },
                content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
              }
            ]
          }
        ]
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

function getCampaignValidMessages(campaign) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getCampaignValidConfirmationMessages(campaign) {
  const messages = [];

  if (
    !isEmpty(campaign.confirmationMessage1) &&
    !isNil(campaign.confirmationMessage1)
  ) {
    messages.push(campaign.confirmationMessage1);
  }

  if (
    !isEmpty(campaign.confirmationMessage2) &&
    !isNil(campaign.confirmationMessage2)
  ) {
    messages.push(campaign.confirmationMessage2);
  }

  if (
    !isEmpty(campaign.confirmationMessage3) &&
    !isNil(campaign.confirmationMessage3)
  ) {
    messages.push(campaign.confirmationMessage3);
  }

  if (
    !isEmpty(campaign.confirmationMessage4) &&
    !isNil(campaign.confirmationMessage4)
  ) {
    messages.push(campaign.confirmationMessage4);
  }

  if (
    !isEmpty(campaign.confirmationMessage5) &&
    !isNil(campaign.confirmationMessage5)
  ) {
    messages.push(campaign.confirmationMessage5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name);
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email);
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number);
  }

  if (variables[0]?.value !== '[]') {
    variables.forEach(variable => {
      if (finalMessage.includes(`{${variable.key}}`)) {
        const regex = new RegExp(`{${variable.key}}`, "g");
        finalMessage = finalMessage.replace(regex, variable.value);
      }
    });
  }

  return finalMessage;
}

const checkerWeek = async () => {
  const sab = moment().day() === 6;
  const dom = moment().day() === 0;

  const sabado = await CampaignSetting.findOne({
    where: { key: "sabado" }
  });

  const domingo = await CampaignSetting.findOne({
    where: { key: "domingo" }
  });

  if (sabado?.value === "false" && sab) {
    messageQueue.pause();
    return true;
  }

  if (domingo?.value === "false" && dom) {
    messageQueue.pause();
    return true;
  }

  messageQueue.resume();
  return false;
};

const checkTime = async () => {
  const startHour = await CampaignSetting.findOne({
    where: {
      key: "startHour"
    }
  });

  const endHour = await CampaignSetting.findOne({
    where: {
      key: "endHour"
    }
  });

  const hour = startHour.value as unknown as number;
  const endHours = endHour.value as unknown as number;

  const timeNow = moment().format("HH:mm") as unknown as number;

  if (timeNow <= endHours && timeNow >= hour) {
    messageQueue.resume();

    return true;
  }


  logger.info(
    `Envio inicia as ${hour} e termina as ${endHours}, hora atual ${timeNow} não está dentro do horário`
  );
  messageQueue.clean(0, "delayed");
  messageQueue.clean(0, "wait");
  messageQueue.clean(0, "active");
  messageQueue.clean(0, "completed");
  messageQueue.clean(0, "failed");
  messageQueue.pause();

  return false;
};

// const checkerLimitToday = async (whatsappId: number) => {
//   try {

//     const setting = await SettingMessage.findOne({
//       where: { whatsappId: whatsappId }
//     });


//     const lastUpdate = moment(setting.dateStart);

//     const now = moment();

//     const passou = now.isAfter(lastUpdate, "day");



//     if (setting.sendToday <= setting.limit) {
//       await setting.update({
//         dateStart: moment().format()
//       });

//       return true;
//     }

//     const zerar = true
//     if(passou) {
//       await setting.update({
//         sendToday: 0,
//         dateStart: moment().format()
//       });

//       setting.reload();
//     }


//     setting.reload();

//     logger.info(`Enviada hoje ${setting.sendToday} limite ${setting.limit}`);
//     // sendMassMessage.clean(0, "delayed");
//     // sendMassMessage.clean(0, "wait");
//     // sendMassMessage.clean(0, "active");
//     // sendMassMessage.clean(0, "completed");
//     // sendMassMessage.clean(0, "failed");
//     // sendMassMessage.pause();
//     return false;
//   } catch (error) {
//     logger.error("conexão não tem configuração de envio.");
//   }
// };

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign) {
  let count1 = 0;
  let companyId = campaign.companyId;

  // Se for campanha por lista de contatos
  if (campaign.contactListId && campaign.contactList) {
    const { contacts } = campaign.contactList;
    count1 = contacts.length;
  }
  // Se for campanha por tags, contar os CampaignShipping
  else if (campaign.tagListId) {
    count1 = await CampaignShipping.count({
      where: {
        campaignId: campaign.id
      }
    });
  }

  const count2 = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.ne]: null
      },
      confirmation: campaign.confirmation ? true : { [Op.or]: [null, false] }
    }
  });

  if (count1 === count2 && count1 > 0) {
    await campaign.update({ status: "FINALIZADA", completedAt: moment() });
  }

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });
}

async function handleProcessCampaign(job) {
  try {
    const { id }: ProcessCampaignData = job.data;
    const campaign = await getCampaign(id);
    const settings = await getSettings(campaign);
    if (campaign) {
      let contacts = null;
      
      // Se for campanha por lista de contatos
      if (campaign.contactListId && campaign.contactList) {
        contacts = campaign.contactList.contacts;
      }
      // Se for campanha por tags
      else if (campaign.tagListId) {
        
        // Buscar contatos via ContactTags (tags comuns)
        const contactTags = await ContactTag.findAll({
          where: { tagId: campaign.tagListId },
          include: [{
            model: Contact,
            as: "contact",
            attributes: ["id", "name", "number", "email", "isGroup"]
          }]
        });
        
        // Buscar contatos via TicketTags (tags kanban)
        const ticketTags = await TicketTag.findAll({
          where: { tagId: campaign.tagListId },
          include: [{
            model: Ticket,
            as: "ticket",
            include: [{
              model: Contact,
              as: "contact",
              attributes: ["id", "name", "number", "email", "isGroup"]
            }]
          }]
        });
        
        // Combinar contatos de ambas as fontes, filtrando nulls
        const allContacts = [
          ...contactTags.map(ct => ct.contact).filter(c => c != null),
          ...ticketTags.map(tt => tt.ticket?.contact).filter(c => c != null)
        ];

        // Remover duplicados
        const uniqueContacts = allContacts.filter((contact, index, self) =>
          contact && index === self.findIndex(c => c && c.id === contact.id)
        );
        
        contacts = uniqueContacts;
      }
      
      if (isArray(contacts)) {
        const contactData = contacts.map(contact => ({
          contactId: contact.id,
          campaignId: campaign.id,
          variables: settings.variables,
          isGroup: contact.isGroup
        }));

        // const baseDelay = job.data.delay || 0;
        const longerIntervalAfter = parseToMilliseconds(settings.longerIntervalAfter);
        const greaterInterval = parseToMilliseconds(settings.greaterInterval);
        const messageInterval = settings.messageInterval;

        let baseDelay = campaign.scheduledAt;

        // const isOpen = await checkTime();
        // const isFds = await checkerWeek();

        const queuePromises = [];
        for (let i = 0; i < contactData.length; i++) {
          baseDelay = addSeconds(baseDelay, i > longerIntervalAfter ? greaterInterval : messageInterval);

          const { contactId, campaignId, variables } = contactData[i];
          const delay = calculateDelay(i, baseDelay, longerIntervalAfter, greaterInterval, messageInterval);
          // if (isOpen || !isFds) {
          const queuePromise = campaignQueue.add(
            "PrepareContact",
            { contactId, campaignId, variables, delay },
            { removeOnComplete: true }
          );
          queuePromises.push(queuePromise);
          logger.info(`Registro enviado pra fila de disparo: Campanha=${campaign.id};Contato=${contacts[i].name};delay=${delay}`);
          // }
        }
        await Promise.all(queuePromises);
        // await campaign.update({ status: "EM_ANDAMENTO" });
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> ProcessCampaign -> error: ${err.message}`);
    
    // Atualizar status da campanha para falha em caso de erro grave
    try {
      if (id) {
        await Campaign.update(
          { 
            status: "CANCELADA"
          },
          { where: { id: id } }
        );
      }
    } catch (updateErr) {
      logger.error(`campaignQueue -> ProcessCampaign -> update error: ${updateErr.message}`);
    }
  }
}

function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval
  } else {
    return diffSeconds * 1000 + messageInterval
  }
}

async function handlePrepareContact(job) {
  try {
    const { contactId, campaignId, delay, variables }: PrepareContactData =
      job.data;
    const campaign = await getCampaign(campaignId);
    const isTagCampaign = !!campaign.tagListId;
    const contact = await getContact(contactId, isTagCampaign);
    const campaignShipping: any = {};
    campaignShipping.number = contact.number;
    campaignShipping.contactId = contactId;
    campaignShipping.campaignId = campaignId;
    const messages = getCampaignValidMessages(campaign);

    if (messages.length >= 0) {
      const radomIndex = randomValue(0, messages.length);

      const message = getProcessedMessage(
        messages[radomIndex] || "",
        variables,
        contact
      );

      campaignShipping.message = message === null ? "" : `\u200c ${message}`;
    }
    if (campaign.confirmation) {
      const confirmationMessages =
        getCampaignValidConfirmationMessages(campaign);
      if (confirmationMessages.length) {
        const radomIndex = randomValue(0, confirmationMessages.length);
        const message = getProcessedMessage(
          confirmationMessages[radomIndex] || "",
          variables,
          contact
        );
        campaignShipping.confirmationMessage = `\u200c ${message}`;
      }
    }
    const [record, created] = await CampaignShipping.findOrCreate({
      where: {
        campaignId: campaignShipping.campaignId,
        contactId: campaignShipping.contactId
      },
      defaults: campaignShipping
    });

    if (
      !created &&
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
    }

    if (
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        },
        {
          delay
        }
      );

      await record.update({ jobId: String(nextJob.id) });
    }

    await verifyAndFinalizeCampaign(campaign);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
    
    // Atualizar registro com erro para não travar a fila
    try {
      if (contactId && campaignId) {
        await CampaignShipping.update(
          { 
            deliveredAt: moment()
          },
          { 
            where: { 
              contactId: contactId,
              campaignId: campaignId
            } 
          }
        );
      }
    } catch (updateErr) {
      logger.error(`campaignQueue -> PrepareContact -> update error: ${updateErr.message}`);
    }
  }
}

async function handleDispatchOfficialCampaign(campaign: any, campaignShippingId: number) {
  const campaignShipping = await CampaignShipping.findByPk(campaignShippingId);

  if (!campaignShipping) {
    logger.error(`[OfficialCampaign] CampaignShipping ${campaignShippingId} não encontrado`);
    return;
  }

  const isTagCampaign = !!campaign.tagListId;
  let contactData: any;
  if (isTagCampaign) {
    contactData = await Contact.findByPk(campaignShipping.contactId, {
      attributes: ["id", "name", "number", "email"]
    });
  } else {
    const item = await ContactListItem.findByPk(campaignShipping.contactId);
    if (item) {
      contactData = { id: item.id, name: item.name, number: item.number, email: item.email };
    }
  }

  if (!contactData) {
    logger.error(`[OfficialCampaign] Contato não encontrado para campaignShipping=${campaignShippingId}`);
    return;
  }

  const { coexistencePhoneNumberId, coexistencePermanentToken } = campaign.whatsapp;

  if (!coexistencePhoneNumberId || !coexistencePermanentToken) {
    logger.error(`[OfficialCampaign] Conexão oficial sem phoneNumberId/token: whatsappId=${campaign.whatsappId}`);
    return;
  }

  const phone = campaignShipping.number || contactData.number;
  const client = buildGraphClient(coexistencePermanentToken);

  try {
    await client.post(`${coexistencePhoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: campaign.templateName,
        language: { code: campaign.templateLanguage || "pt_BR" },
        components: campaign.templateParams || []
      }
    });

    await campaignShipping.update({ deliveredAt: moment() });
    logger.info(`[OfficialCampaign] Enviado para ${phone} | campanha=${campaign.id}`);
  } catch (err: any) {
    logger.error(`[OfficialCampaign] Erro ao enviar para ${phone}: ${err.message}`);
    throw err;
  }

  await verifyAndFinalizeCampaign(campaign);

  const io = getIO();
  io.of(String(campaign.companyId))
    .emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });
}

async function handleDispatchCampaign(job) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;
    const campaign = await getCampaign(campaignId);

    if (!campaign.whatsapp) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp not found`);
      return;
    }

    // Bifurcação: campanha via API Oficial (Meta Cloud API)
    if (campaign.channel === "whatsapp_official") {
      await handleDispatchOfficialCampaign(campaign, campaignShippingId);
      return;
    }

    const wbot = await GetWhatsappWbot(campaign.whatsapp);

    if (!wbot) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot not found`);
      return;
    }

    if (!wbot?.user?.id) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot user not found`);
      return;
    }

    logger.info(
      `Disparo de campanha solicitado: Campanha=${campaignId};Registro=${campaignShippingId}`
    );

    const isTagCampaign = !!campaign.tagListId;
    const campaignShipping = await CampaignShipping.findByPk(campaignShippingId);

    if (!campaignShipping) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: campaignShipping ${campaignShippingId} not found`);
      return;
    }

    let contactData: any;
    if (isTagCampaign) {
      // Tag campaign: contactId = Contact.id
      contactData = await Contact.findByPk(campaignShipping.contactId, {
        attributes: ["id", "name", "number", "email", "isGroup"]
      });
    } else {
      // List campaign: contactId = ContactListItem.id
      const item = await ContactListItem.findByPk(campaignShipping.contactId);
      if (item) {
        contactData = {
          id: item.id,
          name: item.name,
          number: item.number,
          email: item.email,
          isGroup: item.isGroup
        };
      }
    }

    if (!contactData) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: contact not found for contactId=${campaignShipping.contactId}`);
      return;
    }

    const chatId = contactData.isGroup ? `${campaignShipping.number}@g.us` : `${campaignShipping.number}@s.whatsapp.net`;

    if (campaign.openTicket === "enabled") {
      const [contact] = await Contact.findOrCreate({
        where: {
          number: campaignShipping.number,
          companyId: campaign.companyId
        },
        defaults: {
          companyId: campaign.companyId,
          name: contactData.name,
          number: campaignShipping.number,
          email: contactData.email,
          whatsappId: campaign.whatsappId,
          profilePicUrl: ""
        }
      })
      const whatsapp = await Whatsapp.findByPk(campaign.whatsappId);

      let ticket = await Ticket.findOne({
        where: {
          contactId: contact.id,
          companyId: campaign.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      })

      if (!ticket) {
        ticket = await Ticket.findOne({
          where: {
            contactId: contact.id,
            companyId: campaign.companyId,
            whatsappId: whatsapp.id
          },
          order: [["updatedAt", "DESC"]]
        });

        if (ticket) {
          await ticket.update({
            queueId: campaign?.queueId,
            userId: campaign?.userId,
            status: campaign?.statusTicket
          });
        }
      }

      if (!ticket) {
        ticket = await Ticket.create({
          companyId: campaign.companyId,
          contactId: contact.id,
          whatsappId: whatsapp.id,
          queueId: campaign?.queueId,
          userId: campaign?.userId,
          status: campaign?.statusTicket
        });
      }

      ticket = await ShowTicketService(ticket.id, campaign.companyId);

      if (whatsapp.status === "CONNECTED") {
        if (campaign.confirmation && campaignShipping.confirmation === null) {
          const confirmationMessage = await wbot.sendMessage(chatId, {
            text: `\u200c ${campaignShipping.confirmationMessage}`
          });

          await verifyMessage(confirmationMessage, ticket, contact, null, true, false);

          await campaignShipping.update({ confirmationRequestedAt: moment() });
        } else {

          if (campaign.templateData?.length) {
            await sendCampaignTemplateBlocks(wbot, chatId, campaign, campaignShipping.message, ticket, contact);
          } else if (!campaign.mediaPath) {
            const sentMessage = await wbot.sendMessage(chatId, {
              text: `\u200c ${campaignShipping.message}`
            });

            await verifyMessage(sentMessage, ticket, contact, null, true, false);
          } else {
            const publicFolder = path.resolve(__dirname, "..", "public");
            const filePath = path.join(publicFolder, `company${campaign.companyId}`, campaign.mediaPath);

            const options = await getMessageOptions(campaign.mediaName, filePath, String(campaign.companyId), `\u200c ${campaignShipping.message}`);
            if (Object.keys(options).length) {
              if (options.mimetype === "audio/mp4") {
                const audioMessage = await wbot.sendMessage(chatId, {
                  text: `\u200c ${campaignShipping.message}`
                });

                await verifyMessage(audioMessage, ticket, contact, null, true, false);
              }
              const sentMessage = await wbot.sendMessage(chatId, { ...options });

              await verifyMediaMessage(sentMessage, ticket, ticket.contact, null, false, true, wbot);
            }
          }
        }
        await campaignShipping.update({ deliveredAt: moment() });
      }
    }
    else {


      if (campaign.confirmation && campaignShipping.confirmation === null) {
        await wbot.sendMessage(chatId, {
          text: campaignShipping.confirmationMessage
        });
        await campaignShipping.update({ confirmationRequestedAt: moment() });

      } else {

        if (campaign.templateData?.length) {
          await sendCampaignTemplateBlocks(wbot, chatId, campaign, campaignShipping.message, undefined, contactData);
        } else if (!campaign.mediaPath) {
          await wbot.sendMessage(chatId, {
            text: campaignShipping.message
          });
        } else {
          const publicFolder = path.resolve(__dirname, "..", "public");
          const filePath = path.join(publicFolder, `company${campaign.companyId}`, campaign.mediaPath);

          const options = await getMessageOptions(campaign.mediaName, filePath, String(campaign.companyId), campaignShipping.message);
          if (Object.keys(options).length) {
            if (options.mimetype === "audio/mp4") {
              await wbot.sendMessage(chatId, {
                text: campaignShipping.message
              });
            }
            await wbot.sendMessage(chatId, { ...options });
          }
        }
      }

      await campaignShipping.update({ deliveredAt: moment() });

    }
    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.of(String(campaign.companyId))
      .emit(`company-${campaign.companyId}-campaign`, {
        action: "update",
        record: campaign
      });

    logger.info(
      `Campanha enviada para: Campanha=${campaignId};Contato=${contactData.name}`
    );
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> DispatchCampaign -> error: ${err.message}`);
    console.log(err.stack);
    
    // Atualizar registro com erro para não travar a fila
    try {
      if (campaignShippingId) {
        await CampaignShipping.update(
          { 
            deliveredAt: moment()
          },
          { where: { id: campaignShippingId } }
        );
      }
    } catch (updateErr) {
      logger.error(`campaignQueue -> DispatchCampaign -> update error: ${updateErr.message}`);
    }
  }
}

async function handleLoginStatus(job) {
  const thresholdTime = new Date();
  thresholdTime.setMinutes(thresholdTime.getMinutes() - 5);

  await User.update({ online: false }, {
    where: {
      updatedAt: { [Op.lt]: thresholdTime },
      online: true,
    },
  });
}

async function handleResumeTicketsOutOfHour(job) {
  // logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"],
          where: {
            timeSendQueue: { [Op.gt]: 0 }
          }
        },
      ]
    });

    companies.map(async c => {

      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {
          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                attributes: ["id"],
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  },
                  // isOutOfHour: false
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "disableBot", "urlPicture", "lgpdAcceptedAt", "companyId"],
                    include: ["extraInfo", "tags"]
                  },
                  {
                    model: Queue,
                    as: "queue",
                    attributes: ["id", "name", "color"]
                  },
                  {
                    model: Whatsapp,
                    as: "whatsapp",
                    attributes: ["id", "name", "expiresTicket", "groupAsTicket"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.of(String(companyId))
                    // .to("notification")
                    // .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
};

async function handleVerifyQueue(job) {
  // logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"]
        },
      ]
    });

    companies.map(async c => {

      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {
          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                attributes: ["id"],
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  },
                  // isOutOfHour: false
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "disableBot", "urlPicture", "lgpdAcceptedAt", "companyId"],
                    include: ["extraInfo", "tags"]
                  },
                  {
                    model: Queue,
                    as: "queue",
                    attributes: ["id", "name", "color"]
                  },
                  {
                    model: Whatsapp,
                    as: "whatsapp",
                    attributes: ["id", "name", "expiresTicket", "groupAsTicket"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await CreateLogTicketService({
                    userId: null,
                    queueId: idQueue,
                    ticketId: ticket.id,
                    type: "redirect"
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.of(String(companyId))
                    // .to("notification")
                    // .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
};

async function handleRandomUser() {
  // logger.info("Iniciando a randomização dos atendimentos...");

  const jobR = new CronJob('0 */2 * * * *', async () => {

    try {
      const companies = await Company.findAll({
        attributes: ['id', 'name'],
        where: {
          status: true
        },
        include: [
          {
            model: Queues,
            attributes: ["id", "name", "ativarRoteador", "tempoRoteador"],
            where: {
              ativarRoteador: true,
              tempoRoteador: {
                [Op.ne]: 0
              }
            }
          },
        ]
      });

      if (companies) {
        companies.map(async c => {
          c.queues.map(async q => {
            const { count, rows: tickets } = await Ticket.findAndCountAll({
              where: {
                companyId: c.id,
                status: "pending",
                queueId: q.id,
              },
            });

            //logger.info(`Localizado: ${count} filas para randomização.`);

            const getRandomUserId = (userIds) => {
              const randomIndex = Math.floor(Math.random() * userIds.length);
              return userIds[randomIndex];
            };

            // Function to fetch the User record by userId
            const findUserById = async (userId, companyId) => {
              try {
                const user = await User.findOne({
                  where: {
                    id: userId,
                    companyId
                  },
                });

                if (user && user?.profile === "user") {
                  if (user.online === true) {
                    return user.id;
                  } else {
                    // logger.info("USER OFFLINE");
                    return 0;
                  }
                } else {
                  // logger.info("ADMIN");
                  return 0;
                }

              } catch (errorV) {
                Sentry.captureException(errorV);
                logger.error("SearchForUsersRandom -> VerifyUsersRandom: error", errorV.message);
                throw errorV;
              }
            };

            if (count > 0) {
              for (const ticket of tickets) {
                const { queueId, userId } = ticket;
                const tempoRoteador = q.tempoRoteador;
                // Find all UserQueue records with the specific queueId
                const userQueues = await UserQueue.findAll({
                  where: {
                    queueId: queueId,
                  },
                });

                const contact = await ShowContactService(ticket.contactId, ticket.companyId);

                // Extract the userIds from the UserQueue records
                const userIds = userQueues.map((userQueue) => userQueue.userId);

                const tempoPassadoB = moment().subtract(tempoRoteador, "minutes").utc().toDate();
                const updatedAtV = new Date(ticket.updatedAt);

                let settings = await CompaniesSettings.findOne({
                  where: {
                    companyId: ticket.companyId
                  }
                });
                const sendGreetingMessageOneQueues = settings.sendGreetingMessageOneQueues === "enabled" || false;

                if (!userId) {
                  // ticket.userId is null, randomly select one of the provided userIds
                  const randomUserId = getRandomUserId(userIds);


                  if (randomUserId !== undefined && await findUserById(randomUserId, ticket.companyId) > 0) {
                    // Update the ticket with the randomly selected userId
                    //ticket.userId = randomUserId;
                    //ticket.save();

                    if (sendGreetingMessageOneQueues) {
                      const ticketToSend = await ShowTicketService(ticket.id, ticket.companyId);

                      await SendWhatsAppMessage({ body: `\u200e *Assistente Virtual*:\nAguarde enquanto localizamos um atendente... Você será atendido em breve!`, ticket: ticketToSend });

                    }

                    await UpdateTicketService({
                      ticketData: { status: "pending", userId: randomUserId },
                      ticketId: ticket.id,
                      companyId: ticket.companyId,

                    });

                    //await ticket.reload();
                    logger.info(`Ticket ID ${ticket.id} atualizado para UserId ${randomUserId} - ${ticket.updatedAt}`);
                  } else {
                    //logger.info(`Ticket ID ${ticket.id} NOT updated with UserId ${randomUserId} - ${ticket.updatedAt}`);            
                  }

                } else if (userIds.includes(userId)) {
                  if (tempoPassadoB > updatedAtV) {
                    // ticket.userId is present and is in userIds, exclude it from random selection
                    const availableUserIds = userIds.filter((id) => id !== userId);

                    if (availableUserIds.length > 0) {
                      // Randomly select one of the remaining userIds
                      const randomUserId = getRandomUserId(availableUserIds);

                      if (randomUserId !== undefined && await findUserById(randomUserId, ticket.companyId) > 0) {
                        // Update the ticket with the randomly selected userId
                        //ticket.userId = randomUserId;
                        //ticket.save();

                        if (sendGreetingMessageOneQueues) {

                          const ticketToSend = await ShowTicketService(ticket.id, ticket.companyId);
                          await SendWhatsAppMessage({ body: "*Assistente Virtual*:\nAguarde enquanto localizamos um atendente... Você será atendido em breve!", ticket: ticketToSend });
                        };

                        await UpdateTicketService({
                          ticketData: { status: "pending", userId: randomUserId },
                          ticketId: ticket.id,
                          companyId: ticket.companyId,

                        });

                        logger.info(`Ticket ID ${ticket.id} atualizado para UserId ${randomUserId} - ${ticket.updatedAt}`);
                      } else {
                        //logger.info(`Ticket ID ${ticket.id} NOT updated with UserId ${randomUserId} - ${ticket.updatedAt}`);            
                      }

                    }
                  }
                }

              }
            }
          })
        })
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error("SearchForUsersRandom -> VerifyUsersRandom: error", e.message);
      throw e;
    }

  });

  jobR.start();
}

async function handleProcessLanes() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll({
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "useKanban"],
          where: {
            useKanban: true
          }
        },
      ]
    });
    companies.map(async c => {

      try {
        const companyId = c.id;

        const ticketTags = await TicketTag.findAll({
          include: [{
            model: Ticket,
            as: "ticket",
            where: {
              status: "open",
              fromMe: true,
              companyId
            },
            attributes: ["id", "contactId", "updatedAt", "whatsappId"]
          }, {
            model: Tag,
            as: "tag",
            attributes: ["id", "timeLane", "nextLaneId", "greetingMessageLane"],
            where: {
              companyId
            }
          }]
        })

        if (ticketTags.length > 0) {
          ticketTags.map(async t => {
            if (!isNil(t?.tag.nextLaneId) && t?.tag.nextLaneId > 0 && t?.tag.timeLane > 0) {
              const nextTag = await Tag.findByPk(t?.tag.nextLaneId);

              const dataLimite = new Date();
              dataLimite.setHours(dataLimite.getHours() - Number(t.tag.timeLane));
              const dataUltimaInteracaoChamado = new Date(t.ticket.updatedAt)

              if (dataUltimaInteracaoChamado < dataLimite) {
                await TicketTag.destroy({ where: { ticketId: t.ticketId, tagId: t.tagId } });
                await TicketTag.create({ ticketId: t.ticketId, tagId: nextTag.id });

                const whatsapp = await Whatsapp.findByPk(t.ticket.whatsappId);

                if (!isNil(nextTag.greetingMessageLane) && nextTag.greetingMessageLane !== "") {
                  const bodyMessage = nextTag.greetingMessageLane;

                  const contact = await Contact.findByPk(t.ticket.contactId);
                  const ticketUpdate = await ShowTicketService(t.ticketId, companyId);

                  await SendMessage(whatsapp, {
                    number: contact.number,
                    body: `${formatBody(bodyMessage, ticketUpdate)}`,
                    mediaPath: null,
                    companyId: companyId
                  },
                    contact.isGroup
                  )
                }
              }
            }
          })
        }
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("Process Lanes -> Verify: error", e.message);
        throw e;
      }

    });
  });
  job.start()
}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll({
      where: {
        status: true
      }
    });
    companies.map(async c => {

      try {
        const companyId = c.id;
        await ClosedAllOpenTickets(companyId);
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
        throw e;
      }

    });
  });
  job.start()
}

async function handleWhatsapp() {
  const jobW = new CronJob('* 15 3 * * *', async () => {
    //*Whatsapp
    GetWhatsapp();
    jobW.stop();
  }, null, false, 'America/Sao_Paulo')
  jobW.start();
}

async function handleInvoiceCreate() {
  logger.info("GERANDO RECEITA...");
  const job = new CronJob('*/30 * * * * *', async () => {
    const companies = await Company.findAll();
    companies.map(async c => {
    
      const status = c.status;
      const dueDate = c.dueDate; 
      const date = moment(dueDate).format();
      const timestamp = moment().format();
      const hoje = moment().format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");
      const diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
      const dias = moment.duration(diff).asDays();
    
      if(status === true){
      	//logger.info(`EMPRESA: ${c.id} está ATIVA com vencimento em: ${vencimento} | ${dias}`);
      
      	//Verifico se a empresa está a mais de 10 dias sem pagamento
        
        if(dias <= -3){
       
          logger.info(`EMPRESA: ${c.id} está VENCIDA A MAIS DE 3 DIAS... INATIVANDO... ${dias}`);
          c.status = false;
          await c.save(); // Save the updated company record
          logger.info(`EMPRESA: ${c.id} foi INATIVADA.`);
          logger.info(`EMPRESA: ${c.id} Desativando conexões com o WhatsApp...`);
          
          try {
    		const whatsapps = await Whatsapp.findAll({
      		where: {
        		companyId: c.id,
      		},
      			attributes: ['id','status','session'],
    		});
    		for (const whatsapp of whatsapps) {
            	if (whatsapp.session) {
    				await whatsapp.update({ status: "DISCONNECTED", session: "" });
    				const wbot = getWbot(whatsapp.id);
    				await wbot.logout();
                	logger.info(`EMPRESA: ${c.id} teve o WhatsApp ${whatsapp.id} desconectado...`);
  				}
    		}
          
  		  } catch (error) {
    		// Lidar com erros, se houver
    		console.error('Erro ao buscar os IDs de WhatsApp:', error);
    		throw error;
  		  }
        
        }else{ // ELSE if(dias <= -3){
        
          const plan = await Plan.findByPk(c.planId);
        
          const sql = `SELECT * FROM "Invoices" WHERE "companyId" = ${c.id} AND "status" = 'open';`
          const openInvoices = await sequelize.query(sql, { type: QueryTypes.SELECT }) as { id: number, dueDate: Date }[];
          const existingInvoice = openInvoices.find(invoice => moment(invoice.dueDate).format("DD/MM/yyyy") === vencimento);
        
          if (existingInvoice) {
            // Due date already exists, no action needed
            //logger.info(`Fatura Existente`);
        
          } else if (openInvoices.length > 0) {
            const updateSql = `UPDATE "Invoices" SET "dueDate" = '${date}' WHERE "id" = ${openInvoices[0].id};`;
            await sequelize.query(updateSql, { type: QueryTypes.UPDATE });
        
            logger.info(`Fatura Atualizada ID: ${openInvoices[0].id}`);
        
          } else {
            const valuePlan = plan.amount.replace(",", ".");
            const sql = `INSERT INTO "Invoices" ("companyId", "dueDate", detail, status, value, users, connections, queues, "updatedAt", "createdAt")
            VALUES (${c.id}, '${date}', '${plan.name}', 'open', ${valuePlan}, ${plan.users}, ${plan.connections}, ${plan.queues}, '${timestamp}', '${timestamp}');`
            const invoiceInsert = await sequelize.query(sql, { type: QueryTypes.INSERT });
        
            logger.info(`Fatura Gerada para o cliente: ${c.id}`);
            // Rest of the code for sending email
          }
        
          
        
        
        } // if(dias <= -6){
        
      }else{ // ELSE if(status === true){
      
      	//logger.info(`EMPRESA: ${c.id} está INATIVA`);
      
      }
    
    
    });
  });
  job.start();
}
handleInvoiceCreate();
handleWhatsapp();
handleProcessLanes();
handleCloseTicketsAutomatic();
handleRandomUser();

export async function startQueueProcess() {
  logger.info("Iniciando processamento de filas");

  messageQueue.process("SendMessage", handleSendMessage);

  scheduleMonitor.process("Verify", handleVerifySchedules);

  sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);
  
  // Logs de erro para sendScheduledMessages
  sendScheduledMessages.on("failed", (job, err) => {
    logger.error(`[SendScheduledMessages] Job ${job.id} falhou: ${err.message}`);
  });
  
  sendScheduledMessages.on("error", (error) => {
    logger.error(`[SendScheduledMessages] Erro na fila: ${error.message}`);
  });
  
  sendScheduledMessages.on("completed", (job) => {
    logger.info(`[SendScheduledMessages] Job ${job.id} completado com sucesso`);
  });

  campaignQueue.process("VerifyCampaignsDaatabase", handleVerifyCampaigns);

  campaignQueue.process("ProcessCampaign", handleProcessCampaign);

  campaignQueue.process("PrepareContact", handlePrepareContact);

  campaignQueue.process("DispatchCampaign", handleDispatchCampaign);

  userMonitor.process("VerifyLoginStatus", handleLoginStatus);

  queueMonitor.process("VerifyQueueStatus", handleVerifyQueue);

  scheduleMonitor.add(
    "Verify",
    {},
    {
      repeat: { cron: "*/30 * * * * *", key: "verify" }, // A cada 30 segundos
      removeOnComplete: true
    }
  );

  campaignQueue.add(
    "VerifyCampaignsDaatabase",
    {},
    {
      repeat: { cron: "*/20 * * * * *", key: "verify-campaing" },
      removeOnComplete: true
    }
  );

  userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: { cron: "* * * * *", key: "verify-login" },
      removeOnComplete: true
    }
  );

  queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: { cron: "0 * * * * *", key: "verify-queue" },
      removeOnComplete: true
    }
  );

  // Execuções agendadas - roda a cada 2 minutos
  const automationJob = new CronJob('*/2 * * * *', async () => {
    try {
      await runAutomationJob();
    } catch (error) {
      logger.error(`[Automation Job] Erro: ${error}`);
    }
  });
  automationJob.start();
  logger.info("[Automation Job] Execuções agendadas - a cada 2 minutos");

  // Processar todas as automações - roda a cada 1 minuto
  const allAutomationsJob = new CronJob('* * * * *', async () => {
    try {
      await runAllAutomationsJob();
    } catch (error) {
      logger.error(`[All Automations Job] Erro: ${error}`);
    }
  });
  allAutomationsJob.start();
  logger.info("[All Automations Job] Processamento geral - a cada 1 minuto");

  // Aniversários - roda diariamente às 09:00
  const birthdayJob = new CronJob('0 9 * * *', async () => {
    try {
      await runBirthdayAutomationJob();
    } catch (error) {
      logger.error(`[Automation Birthday Job] Erro: ${error}`);
    }
  });
  birthdayJob.start();
  logger.info("[Automation Birthday Job] Iniciado - diária às 09:00");

  // Kanban Time - a cada 10 minutos
  const kanbanJob = new CronJob('*/10 * * * *', async () => {
    try {
      await runKanbanAutomationJob();
    } catch (error) {
      logger.error(`[Automation Kanban Job] Erro: ${error}`);
    }
  });
  kanbanJob.start();
  logger.info("[Automation Kanban Job] Iniciado - a cada 10 minutos");

  // No Response - a cada 15 minutos
  const noResponseJob = new CronJob('*/15 * * * *', async () => {
    try {
      await runNoResponseAutomationJob();
    } catch (error) {
      logger.error(`[Automation NoResponse Job] Erro: ${error}`);
    }
  });
  noResponseJob.start();
  logger.info("[Automation NoResponse Job] Iniciado - a cada 15 minutos");

  const dispatchJob = new CronJob('*/5 * * * *', async () => {
    try {
      await runScheduledDispatchers();
    } catch (error) {
      logger.error(`[Scheduled Dispatch Job] Erro: ${error}`);
    }
  });
  dispatchJob.start();
  logger.info("[Scheduled Dispatch Job] Iniciado - a cada 5 minutos");

  const cleanContactsJob = new CronJob('0 7,19 * * *', async () => {
    try {
      logger.info("[cleanLidContacts Job] Iniciando execução agendada");
      await runCleanLidContacts();
      logger.info("[cleanLidContacts Job] Execução concluída");
    } catch (error) {
      logger.error(`[cleanLidContacts Job] Erro: ${error}`);
    }
  });
  cleanContactsJob.start();
  logger.info("[cleanLidContacts Job] Agendado para 07:00 e 19:00 diariamente");

  startDispatchProcessor();
  const mapsService = process.env.GOOGLE_PLACES_API_KEY
    ? GoogleMapsPlacesService
    : GoogleMapsScrapeService;
  processGoogleMapsScrapeQueue(mapsService);
  logger.info(
    `[GoogleMapsScrape] Queue processor iniciado (modo: ${process.env.GOOGLE_PLACES_API_KEY ? "Places API" : "Puppeteer"})`
  );
}