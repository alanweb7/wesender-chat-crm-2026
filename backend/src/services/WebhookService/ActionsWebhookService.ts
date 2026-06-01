import AppError from "../../errors/AppError";
import { WebhookModel } from "../../models/Webhook";
import { sendMessageFlow } from "../../controllers/MessageController";
import { IConnections, INodes } from "./DispatchWebHookService";
import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { Op } from "sequelize";
import CreateContactService from "../ContactServices/CreateContactService";
import Contact from "../../models/Contact";
import CreateTicketService from "../TicketServices/CreateTicketService";
import CreateTicketServiceWebhook from "../TicketServices/CreateTicketServiceWebhook";
import { SendMessage } from "../../helpers/SendMessage";
import { SendCarouselWithFallback } from "../../helpers/SendCarouselMessage";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import Queue from "../../models/Queue";
import fs from "fs";
import GetWhatsappWbot from "../../helpers/GetWhatsappWbot";
import path from "path";
import mime from "mime-types";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import SendWhatsAppMediaFlow, {
  typeSimulation
} from "../WbotServices/SendWhatsAppMediaFlow";
import { randomizarCaminho } from "../../utils/randomizador";
import { SendMessageFlow } from "../../helpers/SendMessageFlow";
import formatBody from "../../helpers/Mustache";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ListFlowBuilderService from "../FlowBuilderService/ListFlowBuilderService";
import ShowPromptService from "../PromptServices/ShowPromptService";
import ListPromptToolSettingsService from "../PromptToolSettingService/ListPromptToolSettingsService";
import CreateMessageService, {
  MessageData
} from "../MessageServices/CreateMessageService";
import { randomString } from "../../utils/randomCode";
import ShowQueueService from "../QueueService/ShowQueueService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { getIO } from "../../libs/socket";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import ShowTicketUUIDService from "../TicketServices/ShowTicketFromUUIDService";
import logger from "../../utils/logger";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import CompaniesSettings from "../../models/CompaniesSettings";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { delay } from "bluebird";
import typebotListener from "../TypebotServices/typebotListener";
import { getWbot } from "../../libs/wbot";
import { SendMenuWithFallback } from "../../helpers/SendInteractiveMenu";
import { proto } from "@whiskeysockets/baileys";
import { handleOpenAi } from "../IntegrationsServices/OpenAiService";
import { IOpenAi } from "../../@types/openai";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import ContactTag from "../../models/ContactTag";
import TicketTraking from "../../models/TicketTraking";
import User from "../../models/User";
import axios from "axios";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import FollowUpNodeService from "../FlowBuilderService/FollowUpNodeService";
import WaitQuestionService from "../FlowBuilderService/WaitQuestionService";
import Message from "../../models/Message";

// Função para extrair valores de objetos JSON usando path
const getNestedValue = (obj: any, path: string): any => {
  if (!path || !obj) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
};
import { getAsaasSecondCopyByCpf } from "../PaymentGatewayService";
import { getBackendUrl } from "../SettingService/UrlService";
import { fetchPdfBufferFromUrl } from "../../helpers/pdfUtils";

// Buffer de mensagens para agrupar antes de enviar à IA
interface MessageBuffer {
  texts: string[];
  medias: proto.IWebMessageInfo[];
  timeout?: NodeJS.Timeout;
  msg?: proto.IWebMessageInfo;
  openAiSettings?: IOpenAi;
  wbot?: any;
  ticket?: Ticket;
  contact?: Contact;
  ticketTraking?: TicketTraking;
}

const directOpenAiMessageBuffer: { [ticketId: number]: MessageBuffer } = {};

interface IAddContact {
  companyId: number;
  name: string;
  phoneNumber: string;
  email?: string;
  dataMore?: any;
}

export const ActionsWebhookService = async (
  whatsappId: number,
  idFlowDb: number,
  companyId: number,
  nodes: INodes[],
  connects: IConnections[],
  nextStage: string,
  dataWebhook: any,
  details: any,
  hashWebhookId: string,
  pressKey?: string,
  idTicket?: number,
  numberPhrase: "" | { number: string; name: string; email: string } = "",
  msg?: proto.IWebMessageInfo
): Promise<string> => {
  try {
    const io = getIO();
    let next = nextStage;
    
    // BLOQUEAR VOLTAR AO NÓ START quando já está em progresso
    if (String(next) === '1') {
      // Verificar se já existe um ticket com fluxo ativo
      if (idTicket) {
        const activeTicket = await Ticket.findOne({
          where: { id: idTicket, flowWebhook: true, lastFlowId: { [Op.ne]: null } }
        });
        
        if (activeTicket && activeTicket.lastFlowId && String(activeTicket.lastFlowId) !== '1') {
          console.log(`🚫 BLOQUEADO: Impedindo volta ao nó start. Usando lastFlowId: ${activeTicket.lastFlowId}`);
          next = activeTicket.lastFlowId;
        }
      }
    }
    console.log(
      "ActionWebhookService | 53",
      idFlowDb,
      companyId,
      nodes,
      connects,
      nextStage,
      dataWebhook,
      details,
      hashWebhookId,
      pressKey,
      idTicket,
      numberPhrase
    );
    let createFieldJsonName = "";

    const connectStatic = connects;
    if (numberPhrase === "") {
      const nameInput = details.inputs.find(item => item.keyValue === "nome");
      if (nameInput && nameInput.data) {
        nameInput.data.split(",").map(dataN => {
          const lineToData = details.keysFull.find(item => item === dataN);
          let sumRes = "";
          if (!lineToData) {
            sumRes = dataN;
          } else {
            sumRes = constructJsonLine(lineToData, dataWebhook);
          }
          createFieldJsonName = createFieldJsonName + sumRes;
        });
      }
    } else {
      createFieldJsonName = numberPhrase.name;
    }

    let numberClient = "";

    if (numberPhrase === "") {
      const numberInput = details.inputs.find(
        item => item.keyValue === "celular"
      );

      if (numberInput && numberInput.data) {
        numberInput.data.split(",").map(dataN => {
          const lineToDataNumber = details.keysFull.find(item => item === dataN);
          let createFieldJsonNumber = "";
          if (!lineToDataNumber) {
            createFieldJsonNumber = dataN;
          } else {
            createFieldJsonNumber = constructJsonLine(lineToDataNumber, dataWebhook);
          }
          createFieldJsonNumber = createFieldJsonNumber + createFieldJsonNumber;
        });
      }
    } else {
      numberClient = numberPhrase.number;
    }

    numberClient = removerNaoLetrasNumeros(numberClient);

    if (numberClient.substring(0, 2) === "55") {
      if (parseInt(numberClient.substring(2, 4)) >= 31) {
        if (numberClient.length === 13) {
          numberClient =
            numberClient.substring(0, 4) + numberClient.substring(5, 13);
        }
      }
    }

    let createFieldJsonEmail = "";

    if (numberPhrase === "") {
      const emailInput = details.inputs.find(item => item.keyValue === "email");
      if (emailInput && emailInput.data) {
        emailInput.data.split(",").map(dataN => {
          const lineToDataEmail = details.keysFull.find(item =>
            item.endsWith("email")
          );

          let sumRes = "";
          if (!lineToDataEmail) {
            sumRes = dataN;
          } else {
          sumRes = constructJsonLine(lineToDataEmail, dataWebhook);
        }

        createFieldJsonEmail = createFieldJsonEmail + sumRes;
        });
      }
    } else {
      createFieldJsonEmail = numberPhrase.email || "";
    }

    const lengthLoop = nodes.length;
    const whatsapp = await GetDefaultWhatsApp(whatsappId, companyId);

    // Função para verificar se ticket tem usuário atribuído e encerrar se necessário
    const checkAndCloseTicketIfAssigned = async (ticketId: string) => {
      try {
        const ticket = await Ticket.findOne({
          where: { id: ticketId, whatsappId },
          include: [{ model: User, as: "user" }]
        });

        if (ticket && ticket.userId) {
          console.log(`Ticket ${ticketId} está com usuário ${ticket.user.name}, encerrando fluxo automático`);
          
          // Atualizar status para closed
          await ticket.update({
            status: "closed",
            closedAt: new Date()
          });

          // Emitir WebSocket para atualizar frontend
          const io = getIO();
          const ticketUpdated = await ShowTicketService(ticket.id, companyId);
          io.of(String(companyId))
            .emit(`company-${companyId}-ticket`, {
              action: "update",
              ticket: ticketUpdated
            });

          return true; // Indica que o fluxo deve parar
        }
        
        return false; // Continua o fluxo normalmente
      } catch (error) {
        console.error("Erro ao verificar status do ticket:", error);
        return false;
      }
    };

    if (whatsapp.status !== "CONNECTED") {
      return;
    }

    let execCount = 0;

    let execFn = "";

    let ticket = null;

    let noAlterNext = false;

    let isContinue = false;

    for (var i = 0; i < lengthLoop; i++) {
      let nodeSelected: any;
      let ticketInit: Ticket;

      console.log(`=== LOOP PRINCIPAL ${i} - Buscando nó: ${next} ===`);

      // Verificar se ticket tem usuário atribuído e encerrar fluxo se necessário
      if (idTicket) {
        const shouldStop = await checkAndCloseTicketIfAssigned(idTicket.toString());
        if (shouldStop) {
          console.log("Fluxo encerrado pois ticket está com usuário atribuído");
          break;
        }
      }

      const awaitingAsaasResponse =
        !!pressKey &&
        dataWebhook?.asaasState?.awaiting === true &&
        dataWebhook?.asaasState?.nodeId === next;

      if (pressKey) {
        console.log("UPDATE2... pressKey:", pressKey);
        console.log("UPDATE2... execFn:", execFn);
        console.log("UPDATE2... next:", next);
        
        if (pressKey === "parar") {
          console.log("UPDATE3...");
          if (idTicket) {
            console.log("UPDATE4...");
            ticketInit = await Ticket.findOne({
              where: { id: idTicket, whatsappId }
            });
            await ticket.update({
              status: "closed"
            });
          }
          break;
        }

        if (awaitingAsaasResponse) {
          console.log("UPDATE5... ASAAS RESPONSE");
          nodeSelected = nodes.find(node => node.id === next);
        } else if (execFn === "") {
          console.log("UPDATE5... execFn está vazio, usando nó atual do menu");
          // Não criar menu vazio, usar o nó menu atual
          nodeSelected = nodes.find(node => node.id === next);
          if (!nodeSelected) {
            console.log("ERRO: Nó menu não encontrado com next:", next);
            break;
          }
        } else {
          console.log("UPDATE6... buscando nó com ID:", execFn);
          nodeSelected = nodes.filter(node => node.id === execFn)[0];
          if (!nodeSelected) {
            console.log("ERRO: Nó não encontrado com execFn:", execFn);
          }
        }

        console.log(`Nó encontrado: ${nodeSelected?.id} - Tipo: ${nodeSelected?.type}`);
      } else {
        // Se execFn foi setado (por exemplo, em caso de erro), usar execFn em vez de next
        const nodeToFind = execFn !== "" ? execFn : next;
        console.log("UPDATE7... sem pressKey, buscando:", nodeToFind, "(execFn:", execFn, ", next:", next, ")");
        const otherNode = nodes.filter(node => node.id === nodeToFind)[0];
        if (otherNode) {
          nodeSelected = otherNode;
          console.log(`Nó encontrado: ${nodeSelected?.id} - Tipo: ${nodeSelected?.type}`);
          // Resetar execFn após usar
          if (execFn !== "") {
            next = execFn;
            execFn = "";
          }
        } else {
          console.log("ERRO: Nó não encontrado com ID:", nodeToFind);
          console.log(
            "Nós disponíveis:",
            nodes.map(n => ({ id: n.id, type: n.type }))
          );
          break;
        }
      }

      // VALIDAÇÃO: Verificar se nodeSelected foi encontrado
      if (!nodeSelected) {
        console.log("ERRO: nodeSelected é undefined - pulando iteração");
        console.log("next:", next, "execFn:", execFn);
        continue;
      }

      if (nodeSelected.type === "message") {
        // Garantir que o ticket existe antes de acessar dataWebhook
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        let msg;

        const webhook = ticket?.dataWebhook;

        if (webhook && webhook.hasOwnProperty("variables")) {
          msg = {
            body: replaceMessages(webhook, nodeSelected.data.label)
          };
        } else {
          msg = {
            body: nodeSelected.data.label
          };
        }

        await SendMessage(whatsapp, {
          number: numberClient,
          body: msg.body
        });

        //TESTE BOTÃO
        //await SendMessageFlow(whatsapp, {
        //  number: numberClient,
        //  body: msg.body
        //} )
        await intervalWhats("1");
      }
      console.log("273");
      if (nodeSelected.type === "typebot") {
        console.log("275");
        const wbot = getWbot(whatsapp.id);
        await typebotListener({
          wbot: wbot,
          msg,
          ticket,
          typebot: nodeSelected.data.typebotIntegration
        });
      }

      if (nodeSelected.type === "menu") {
        // Garantir que o ticket existe antes de processar menu
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        console.log("650 menu");
        console.log("Menu data:", nodeSelected.data);
        console.log("PressKey:", pressKey);
        
        // Verificar se nodeSelected.data existe
        if (!nodeSelected.data || !nodeSelected.data.arrayOption) {
          console.log("ERRO: Menu não possui dados ou arrayOption", nodeSelected);
          break;
        }
        
        console.log("Array options:", nodeSelected.data.arrayOption);
        
        if (pressKey) {
          // Tenta encontrar por número ou por valor (texto)
          let selectedOption = nodeSelected.data.arrayOption.find(
            option => option.number == pressKey
          );
          
          // Se não encontrar por número, tenta por valor (texto)
          if (!selectedOption) {
            selectedOption = nodeSelected.data.arrayOption.find(
              option => option.value === pressKey || option.value.toLowerCase() === pressKey.toLowerCase()
            );
          }
          
          if (selectedOption) {
            console.log("Opção selecionada:", selectedOption);
            next = selectedOption.next;
            console.log("Próximo nó definido:", next);
            
            // Se next não estiver definido, usar as conexões do flow
            if (!next && connects) {
              console.log("Next undefined, buscando nas conexões...");
              const optionIndex = nodeSelected.data.arrayOption.findIndex(
                opt => opt.number == pressKey || opt.value === pressKey || opt.value.toLowerCase() === pressKey.toLowerCase()
              );
              const sourceHandle = `a${optionIndex + 1}`;
              const connection = connects.find(conn => 
                conn.source === nodeSelected.id && conn.sourceHandle === sourceHandle
              );
              if (connection) {
                next = connection.target;
                console.log("Próximo nó encontrado via conexão:", next);
              }
            }
          } else {
            console.log("Opção não encontrada para:", pressKey, "- aguardando seleção válida");
            // Usuário digitou algo que não corresponde a nenhuma opção — não faz nada
            return;
          }
        } else {
          console.log("Nenhum pressKey fornecido - enviando mensagem do menu");
          
          // Garantir que o ticket tenha o contact carregado
          if (!ticket.contact) {
            ticket = await ShowTicketService(ticket.id, companyId);
          }
          
          // Processar variáveis na mensagem do menu
          let processedMessage = nodeSelected.data.message;
          if (ticket && ticket.contact) {
            processedMessage = formatBody(processedMessage, ticket);
            console.log("Variáveis processadas:", processedMessage);
          } else {
            console.log("ERRO: ticket ou ticket.contact não disponível para processar variáveis");
          }
          
          const webhook = ticket?.dataWebhook;
          let finalMessage = processedMessage;
          if (webhook && webhook.hasOwnProperty("variables")) {
            finalMessage = replaceMessages(webhook, processedMessage);
          }
          
          console.log("Enviando mensagem do menu:", finalMessage);
          
          const ticketDetails = await ShowTicketService(ticket.id, companyId);
          
          // Enviar menu interativo com fallback para texto
          try {
            await SendMenuWithFallback({
              ticket: ticketDetails,
              menuMessage: finalMessage,
              arrayOption: nodeSelected.data.arrayOption,
              menuType: nodeSelected.data.menuType || "buttons"
            });
          } catch (error) {
            console.error(`Erro ao enviar menu para ticket ${ticket.id}:`, error);
          }
          
          SetTicketMessagesAsRead(ticketDetails);
          await ticketDetails.update({
            lastMessage: formatBody(finalMessage, ticket.contact)
          });
          await intervalWhats("1");
        }
        
        // Se encontrou um próximo nó, processá-lo recursivamente
        if (next && next !== nodeSelected.id) {
          console.log("Menu: Processando próximo nó recursivamente:", next);
          const nextNode = nodes.find(n => n.id === next);
          if (nextNode) {
            // Se o próximo nó é um menu, resetar pressKey pois precisa de nova seleção
            const nextPressKey = nextNode.type === "menu" ? undefined : pressKey;
            console.log("Menu: Próximo nó tipo:", nextNode.type, "pressKey será:", nextPressKey);
            
            // Chamar recursivamente com o próximo nó
            return await ActionsWebhookService(
              whatsappId,
              idFlowDb,
              companyId,
              nodes,
              connects,
              next,
              dataWebhook,
              details,
              hashWebhookId,
              nextPressKey,
              idTicket,
              numberPhrase,
              msg
            );
          }
        }
      }

      if (nodeSelected.type === "openai") {
        console.log(`=== PROCESSANDO NÓ openai (AGENTE IA) ===`);
        console.log(`OpenAI: nodeSelected.data=`, JSON.stringify(nodeSelected.data, null, 2));
        
        try {
          const cfg: any = nodeSelected.data.typebotIntegration || {};
          console.log(`OpenAI: Configuração extraída=`, JSON.stringify(cfg, null, 2));

          // VALIDAÇÃO INICIAL
          if (!cfg || Object.keys(cfg).length === 0) {
            console.error(`OpenAI: ERRO - Nenhuma configuração encontrada no nó`);
            continue;
          }

          let openAiSettings: any;

          const promptIdNumber = cfg.iaId ? Number(cfg.iaId) : NaN;
          console.log(`OpenAI: iaMode=${cfg.iaMode}, iaId=${cfg.iaId}, promptIdNumber=${promptIdNumber}`);

          if (cfg.iaMode === "system" && !Number.isNaN(promptIdNumber)) {
            console.log(`OpenAI: Buscando prompt do sistema ID=${promptIdNumber}`);
            
            const prompt = await ShowPromptService({
              promptId: promptIdNumber,
              companyId
            });

            if (!prompt) {
              console.error(`OpenAI: ERRO - Prompt ID=${promptIdNumber} não encontrado`);
              continue;
            }

            console.log(`OpenAI: Prompt encontrado="${prompt.name}"`);

            openAiSettings = {
              name: prompt.name,
              prompt: prompt.prompt,
              voice: prompt.voice,
              voiceKey: prompt.voiceKey,
              voiceRegion: prompt.voiceRegion,
              maxTokens: Number(prompt.maxTokens),
              temperature: Number(prompt.temperature),
              apiKey: prompt.apiKey,
              queueId: Number(prompt.queueId),
              maxMessages: Number(prompt.maxMessages),
              promptId: Number(prompt.id)
            };
          } else {
            let {
              name,
              prompt,
              voice,
              voiceKey,
              voiceRegion,
              maxTokens,
              temperature,
              apiKey,
              queueId,
              maxMessages
            } = cfg as IOpenAi;

            const normalizeNumeric = (value: string | number | null | undefined, fallback = 0) => {
              if (typeof value === "number") {
                return Number.isFinite(value) ? value : fallback;
              }
              if (typeof value === "string" && value.trim().length) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
              }
              return fallback;
            };

            openAiSettings = {
              name,
              prompt,
              voice,
              voiceKey,
              voiceRegion,
              maxTokens: normalizeNumeric(maxTokens, 800),
              temperature: normalizeNumeric(temperature, 1),
              apiKey,
              queueId: normalizeNumeric(queueId, 0),
              maxMessages: normalizeNumeric(maxMessages, 10),
              promptId: Number.isNaN(promptIdNumber) ? null : promptIdNumber
            };
          }

          try {
            const toolsEnabled = await ListPromptToolSettingsService({
              companyId,
              promptId: openAiSettings.promptId ?? null
            });
            openAiSettings.toolsEnabled = toolsEnabled;
            console.log(`OpenAI: ${toolsEnabled.length} ferramentas habilitadas`);
          } catch (error) {
            console.error("Erro ao carregar toolsEnabled (Webhook):", error);
          }

          // VALIDAÇÃO FINAL
          if (!openAiSettings.prompt || !openAiSettings.apiKey) {
            console.error(`OpenAI: ERRO - Configuração incompleta:`, {
              hasPrompt: !!openAiSettings.prompt,
              hasApiKey: !!openAiSettings.apiKey
            });
            continue;
          }

          console.log(`OpenAI: Configuração validada com sucesso - Iniciando processamento`);

          const contact = await Contact.findOne({
            where: { number: numberClient, companyId }
          });

          const wbot = getWbot(whatsapp.id);

          const ticketTraking = await FindOrCreateATicketTrakingService({
            ticketId: ticket.id,
            companyId,
            userId: null,
            whatsappId: whatsapp?.id
          });

          console.log(`OpenAI: Enviando para handleOpenAi...`);
          await handleOpenAi(
            openAiSettings,
            msg,
            wbot,
            ticket,
            contact,
            null,
            ticketTraking
          );
          
          console.log(`OpenAI: Processamento concluído com sucesso`);
        } catch (error: any) {
          console.error(`OpenAI: ERRO CRÍTICO NO PROCESSAMENTO:`, error);
          console.error(`OpenAI: Stack trace:`, error.stack);
          continue;
        }
      }

      if (nodeSelected.type === "directOpenai") {
        console.log(`=== PROCESSANDO NÓ directOpenai (AGENTE DIRETO) ===`);
        console.log(`DirectOpenAI: nodeSelected.data=`, JSON.stringify(nodeSelected.data, null, 2));
        
        // **FORÇAR: Atualizar lastFlowId imediatamente para ficar preso neste nó**
        if (ticket) {
          console.log(`DirectOpenAI: FORÇANDO atualização do lastFlowId para ${nodeSelected.id}`);
          await ticket.update({ lastFlowId: nodeSelected.id });
        }
        
        try {
          const cfg = nodeSelected.data;
          console.log(`DirectOpenAI: Configuração extraída=`, JSON.stringify(cfg, null, 2));

          // VALIDAÇÃO INICIAL
          if (!cfg || Object.keys(cfg).length === 0) {
            console.error(`DirectOpenAI: ERRO - Nenhuma configuração encontrada no nó`);
            continue;
          }

          // Configuração direta do nó
          const openAiSettings: IOpenAi = {
            name: "Agente Direto",
            prompt: cfg.prompt || "",
            apiKey: cfg.apiKey || "",
            provider: cfg.provider || "openai",
            model: cfg.model || "gemini-2.0-flash",
            voice: cfg.voice || "texto",
            voiceKey: cfg.voiceKey || "",
            voiceRegion: cfg.voiceRegion || "",
            maxTokens: cfg.maxTokens || 1000,
            temperature: cfg.temperature || 0.7,
            queueId: null,
            maxMessages: cfg.maxMessages || 10,
            ttsModel: cfg.ttsModel || "tts-1",
            audioPercentage: cfg.audioPercentage || 30,
            toolsEnabled: cfg.toolsEnabled || [],
            knowledgeBase: cfg.knowledgeBase || [],
            knowledgeBaseIds: cfg.knowledgeBaseIds || []
          };

          console.log(`DirectOpenAI: Configuração montada=`, JSON.stringify(openAiSettings, null, 2));

          // VALIDAÇÃO FINAL
          if (!openAiSettings.prompt || !openAiSettings.apiKey) {
            console.error(`DirectOpenAI: ERRO - Configuração incompleta:`, {
              hasPrompt: !!openAiSettings.prompt,
              hasApiKey: !!openAiSettings.apiKey
            });
            continue;
          }

          console.log(`DirectOpenAI: Configuração validada com sucesso - Iniciando processamento`);

          // Carregar ticket se não estiver carregado
          if (!ticket && idTicket) {
            ticket = await Ticket.findByPk(idTicket);
          }

          if (!ticket) {
            console.error(`DirectOpenAI: Ticket não encontrado (idTicket: ${idTicket})`);
            continue;
          }

          const contact = await Contact.findOne({
            where: { number: numberClient, companyId }
          });

          const ticketTraking = await FindOrCreateATicketTrakingService({
            ticketId: ticket.id,
            companyId,
            userId: null,
            whatsappId: whatsapp?.id
          });

          const wbot = getWbot(whatsapp.id);

          // Se houver mensagem do usuário (msg), processar com a IA
          if (msg) {
            const isAudio = !!msg.message?.audioMessage;
            const isImage = !!msg.message?.imageMessage;
            const isMedia = isAudio || isImage;
            const bodyMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

            // Ignorar mensagens sem conteúdo útil (nem texto nem mídia suportada)
            if (!isMedia && !bodyMessage) {
              console.log(`DirectOpenAI: Mensagem sem texto nem mídia reconhecida, ignorando`);
              continue;
            }

            // Atualiza lastFlowId para este nó para que a próxima mensagem do usuário
            // roteie diretamente para directOpenai em vez de voltar ao menu
            if (ticket && ticket.lastFlowId !== nodeSelected.id) {
              console.log(`DirectOpenAI: Atualizando lastFlowId de "${ticket.lastFlowId}" para "${nodeSelected.id}"`);
              await ticket.update({ lastFlowId: nodeSelected.id });
            }

            // Inicializa o buffer se ainda não existir
            if (!directOpenAiMessageBuffer[ticket.id]) {
              directOpenAiMessageBuffer[ticket.id] = { texts: [], medias: [] };
            }

            const buf = directOpenAiMessageBuffer[ticket.id];

            // Adiciona conteúdo ao buffer conforme o tipo
            if (isMedia) {
              buf.medias.push(msg);
              console.log(`DirectOpenAI: Mídia adicionada ao buffer (${isAudio ? "áudio" : "imagem"}). Total mídias: ${buf.medias.length}`);
            }
            if (bodyMessage) {
              buf.texts.push(bodyMessage);
              console.log(`DirectOpenAI: Texto adicionado ao buffer. Total textos: ${buf.texts.length}`);
            }

            // Atualiza referências de contexto no buffer
            buf.msg = msg;
            buf.openAiSettings = openAiSettings;
            buf.wbot = wbot;
            buf.ticket = ticket;
            buf.contact = contact;
            buf.ticketTraking = ticketTraking;

            // Reinicia o timeout de 12s a cada nova mensagem recebida
            if (buf.timeout) {
              clearTimeout(buf.timeout);
            }

            buf.timeout = setTimeout(async () => {
              try {
                const buffer = directOpenAiMessageBuffer[ticket.id];
                if (!buffer) return;

                delete directOpenAiMessageBuffer[ticket.id];

                const totalTexts = buffer.texts.length;
                const totalMedias = buffer.medias.length;
                console.log(`🧠 DirectOpenAI: Disparando após 12s — ${totalTexts} texto(s), ${totalMedias} mídia(s)`);

                // Monta lista de msgs a enviar: mídias primeiro, depois texto combinado (se houver)
                const msgsToSend: proto.IWebMessageInfo[] = [...buffer.medias];

                if (buffer.texts.length > 0) {
                  const combinedText = buffer.texts.join(". ");
                  // Clona a última msg de referência e injeta o texto combinado
                  const combinedMsg = JSON.parse(JSON.stringify(buffer.msg));
                  if (combinedMsg.message?.audioMessage || combinedMsg.message?.imageMessage) {
                    // msg de referência é mídia — cria envelope de texto puro
                    combinedMsg.message = { conversation: combinedText };
                  } else if (combinedMsg.message?.conversation) {
                    combinedMsg.message.conversation = combinedText;
                  } else if (combinedMsg.message?.extendedTextMessage) {
                    combinedMsg.message.extendedTextMessage.text = combinedText;
                  } else {
                    combinedMsg.message = { conversation: combinedText };
                  }
                  msgsToSend.push(combinedMsg);
                }

                // Envia array (ou msg única) para handleOpenAi
                const payload = msgsToSend.length === 1 ? msgsToSend[0] : msgsToSend;
                await handleOpenAi(
                  buffer.openAiSettings!,
                  payload as any,
                  buffer.wbot,
                  buffer.ticket!,
                  buffer.contact!,
                  null,
                  buffer.ticketTraking
                );

                console.log(`DirectOpenAI: Processamento concluído com sucesso`);
              } catch (error: any) {
                console.error(`DirectOpenAI: ERRO ao processar mensagens agrupadas:`, error);
                console.error(`DirectOpenAI: Stack trace:`, error.stack);
              }
            }, 12000); // 12 segundos

            break;
          }
          
          // Se NÃO houver mensagem (primeira execução do nó), apenas continua o fluxo
          console.log(`DirectOpenAI: Nó ativado, aguardando mensagens do usuário...`);
          
          // **CORREÇÃO: Atualizar lastFlowId na PRIMEIRA entrada no nó directOpenai**
          if (ticket && ticket.lastFlowId !== nodeSelected.id) {
            console.log(`DirectOpenAI: Primeira entrada no nó - atualizando lastFlowId de ${ticket.lastFlowId} para ${nodeSelected.id}`);
            await ticket.update({ lastFlowId: nodeSelected.id });
          }

        } catch (error: any) {
          console.error(`DirectOpenAI: ERRO CRÍTICO NO PROCESSAMENTO:`, error);
          console.error(`DirectOpenAI: Stack trace:`, error.stack);
          continue;
        }
      }

      if (nodeSelected.type === "followUp") {
        console.log("FollowUp: processando nó", nodeSelected.id);

        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({ where: { id: idTicket, companyId } });
        }

        if (!ticket) {
          console.warn("FollowUp: ticket não encontrado, encerrando fluxo");
          break;
        }

        try {
          await FollowUpNodeService.executeFollowUpNode(
            nodeSelected.data,
            ticket.id,
            companyId,
            nodeSelected.id
          );
          console.log(
            `FollowUp: agendado com delay ${nodeSelected?.data?.delayMinutes} min para ticket ${ticket.id}`
          );
        } catch (error) {
          console.error("FollowUp: erro ao agendar follow-up", error);
        }

        console.log("FollowUp: aguardando próximo nó via conexões padrão");
      }

      if (nodeSelected.type === "waitQuestion") {
        console.log("WaitQuestion: processando nó", nodeSelected.id);

        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({ where: { id: idTicket, companyId } });
        }

        if (!ticket) {
          console.warn("WaitQuestion: ticket não encontrado, encerrando fluxo");
          break;
        }

        try {
          const { waitTime, waitUnit, question, mediaType, mediaUrl, mediaName, optionX, optionY, timeoutEnabled, timeoutTime, timeoutUnit } = nodeSelected.data;
          
          // Calcular tempo em segundos (igual ao interval)
          const totalSeconds = waitUnit === "hours" ? waitTime * 3600 : waitTime * 60;
          
          // Aguardar o tempo configurado (igual ao interval)
          console.log(`WaitQuestion: Aguardando ${totalSeconds} segundos...`);
          await new Promise((resolve) => {
            setTimeout(() => {
              console.log(`WaitQuestion: Tempo de espera finalizado.`);
              resolve(true);
            }, totalSeconds * 1000);
          });
          
          // Enviar mídia se existir
          if (mediaType && mediaType !== "none" && mediaUrl) {
            try {
              await SendWhatsAppMediaFlow({
                media: mediaUrl,
                ticket
              });
              console.log(`WaitQuestion: Mídia enviada para ticket ${ticket.id}`);
            } catch (mediaErr) {
              console.error(`WaitQuestion: Erro ao enviar mídia:`, mediaErr);
            }
          }
          
          // Enviar a pergunta (igual ao message)
          if (question) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: question
            });
            console.log(`WaitQuestion: Pergunta enviada para ticket ${ticket.id}`);
          }
          
          // Salvar estado de espera no ticket
          const totalMinutes = waitUnit === "hours" ? waitTime * 60 : waitTime;
          await ticket.update({
            waitingQuestion: true,
            questionNodeId: nodeSelected.id,
            questionOptions: { optionX, optionY },
            timeoutEnabled: !!timeoutEnabled,
            timeoutAt: timeoutEnabled ? new Date(Date.now() + ((timeoutUnit === "hours" ? timeoutTime * 60 : timeoutTime)) * 60000) : null,
            maxQuestionAttempts: 3, // Padrão 3 tentativas
            questionAttempts: 0
          });
          
          console.log(`WaitQuestion: Ticket ${ticket.id} aguardando resposta`);
          
          // Pausar fluxo - aguardar resposta do usuário
          next = null;
          
        } catch (error) {
          console.error("WaitQuestion: erro ao processar", error);
          next = null;
        }
      }

      if (nodeSelected.type === "question") {
        console.log("Question: Debug - idTicket:", idTicket);
        console.log("Question: Debug - ticket antes:", ticket?.id);
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          console.log("Question: Carregando ticket do banco...");
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
          console.log("Question: Ticket carregado:", ticket?.id);
        }
        
        const questionData = nodeSelected.data?.typebotIntegration || {};
        const { message } = questionData;
        const answerKey =
          questionData?.answerKey || `question_${nodeSelected.id}`;

        const currentWebhookData = ticket?.dataWebhook || {};
        const questionState = currentWebhookData?.questionState;
        const awaitingAnswer =
          questionState?.awaiting === true &&
          questionState?.nodeId === nodeSelected.id;

        if (awaitingAnswer) {
          console.log("Question: aguardando resposta do cliente");
          break;
        }

        // Verificar se ticket e contact existem antes de formatar mensagem
        console.log("Question: Debug - ticket existe:", !!ticket);
        console.log("Question: Debug - ticket.contact existe:", !!ticket?.contact);
        console.log("Question: Debug - ticket.contactId:", ticket?.contactId);
        
        if (!ticket || !ticket.contact) {
          console.log("Question: ticket ou contact é nulo, tentando carregar contact...");
          
          // Tentar carregar o contact separadamente
          if (ticket && ticket.contactId && !ticket.contact) {
            console.log("Question: Carregando contact do banco...");
            const Contact = require("../../models/Contact").default;
            ticket.contact = await Contact.findByPk(ticket.contactId);
            console.log("Question: Contact carregado:", !!ticket.contact);
          }
          
          if (!ticket.contact) {
            console.log("Question: Impossível continuar sem contact");
            break;
          }
        }
        
        const questionMessage = formatBody(`${message || ""}`, ticket.contact);
        const ticketDetails = await ShowTicketService(ticket.id, companyId);

        await typeSimulation(ticket, "composing");
        await delay(2000);
        await typeSimulation(ticket, "paused");

        console.log("ActionsWebhookService Node Question1: ", questionMessage);

        await SendWhatsAppMessage({
          body: questionMessage,
          ticket: ticketDetails,
          quotedMsg: null
        });

        SetTicketMessagesAsRead(ticketDetails);

        await ticketDetails.update({
          lastMessage: questionMessage
        });

        const updatedWebhookData = {
          ...currentWebhookData,
          questionState: {
            awaiting: true,
            nodeId: nodeSelected.id,
            answerKey
          }
        };

        await ticket.update({
          userId: null,
          companyId,
          flowWebhook: true,
          lastFlowId: nodeSelected.type === "directOpenai" ? ticket.lastFlowId : nodeSelected.id,
          dataWebhook: updatedWebhookData,
          hashFlowId: hashWebhookId,
          flowStopped: idFlowDb.toString()
        });

        const targetQueueId =
          nodeSelected?.data?.queueId ??
          nodeSelected?.data?.typebotIntegration?.queueId ??
          ticket.queueId;

        if (!targetQueueId) {
          console.warn(
            "ActionsWebhookService question node sem queueId definido; pulando atualização de fila."
          );
          break;
        }

        const queue = await ShowQueueService(Number(targetQueueId), companyId);

        await ticket.update({
          status: "pending",
          queueId: queue.id,
          userId: ticket.userId,
          companyId: companyId,
          flowWebhook: true,
          lastFlowId: nodeSelected.type === "directOpenai" ? ticket.lastFlowId : nodeSelected.id,
          hashFlowId: hashWebhookId,
          flowStopped: idFlowDb.toString()
        });

        await FindOrCreateATicketTrakingService({
          ticketId: ticket.id,
          companyId,
          whatsappId: ticket.whatsappId,
          userId: ticket.userId
        });

        await UpdateTicketService({
          ticketData: {
            status: "pending",
            queueId: queue.id
          },
          ticketId: ticket.id,
          companyId
        });

        await CreateLogTicketService({
          ticketId: ticket.id,
          type: "queue",
          queueId: queue.id
        });

        const settings = await CompaniesSettings.findOne({
          where: {
            companyId: companyId
          }
        });

        const enableQueuePosition = settings?.sendQueuePosition;

        if (enableQueuePosition) {
          const count = await Ticket.findAndCountAll({
            where: {
              userId: null,
              status: "pending",
              companyId,
              queueId: queue.id,
              whatsappId: whatsapp.id,
              isGroup: false
            }
          });

          // Lógica para enviar posição da fila de atendimento
          const qtd = count.count === 0 ? 1 : count.count;

          const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;

          const ticketFilaDetails = await ShowTicketService(ticket.id, companyId);

          // Verificar se ticket.contact existe antes de formatar
          if (!ticket.contact) {
            console.log("Fila: ticket.contact é nulo, pulando mensagem");
            break;
          }
          
          const bodyFila = formatBody(`${msgFila}`, ticket.contact);

          await typeSimulation(ticket, "composing");
          await delay(2000);
          await typeSimulation(ticket, "paused");

          console.log("ActionsWebhookService Node Question2: ", bodyFila);

          await SendWhatsAppMessage({
            body: bodyFila,
            ticket: ticketFilaDetails,
            quotedMsg: null
          });

          SetTicketMessagesAsRead(ticketFilaDetails);

          await ticketFilaDetails.update({
            lastMessage: bodyFila
          });
        }

        console.log("Question: aguardando resposta antes de continuar o fluxo");
        break;
      }

      if (nodeSelected.type === "singleBlock") {
        for (var iLoc = 0; iLoc < nodeSelected.data.seq.length; iLoc++) {
          const elementNowSelected = nodeSelected.data.seq[iLoc];

          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });

          if (elementNowSelected.includes("message")) {
            const bodyFor = nodeSelected.data.elements.filter(
              item => item.number === elementNowSelected
            )[0].value;

            const ticketDetails = await ShowTicketService(idTicket, companyId);

            let msg;

            const webhook = ticket?.dataWebhook;

            console.log("singleBlock: webhook =", JSON.stringify(webhook, null, 2));
            console.log("singleBlock: bodyFor =", bodyFor);

            if (webhook && webhook.hasOwnProperty("variables")) {
              msg = replaceMessages(webhook.variables, bodyFor);
              console.log("singleBlock: msg após replaceMessages =", msg);
            } else {
              msg = bodyFor;
            }

            await typeSimulation(ticket, "composing");
            await delay(2000);
            await typeSimulation(ticket, "paused");

            console.log("ActionsWebhookService Node Question3: ", msg);
            await SendWhatsAppMessage({
              body: msg,
              ticket: ticketDetails,
              quotedMsg: null
            });

            SetTicketMessagesAsRead(ticketDetails);

            // Verificar se ticket.contact existe antes de formatar
            if (!ticket.contact) {
              console.log("Question3: ticket.contact é nulo, usando mensagem original");
              await ticketDetails.update({
                lastMessage: bodyFor
              });
            } else {
              await ticketDetails.update({
                lastMessage: formatBody(bodyFor, ticket.contact)
              });
            }

            await intervalWhats("1");
          }
          if (elementNowSelected.includes("interval")) {
            await intervalWhats(
              nodeSelected.data.elements.filter(
                item => item.number === elementNowSelected
              )[0].value
            );
          }

          if (elementNowSelected.includes("img")) {
            await typeSimulation(ticket, "composing");

            await SendMessage(whatsapp, {
              number: numberClient,
              body: "",
              mediaPath:
                (await getBackendUrl(companyId)) === "https://localhost:8090"
                  ? `${__dirname.split("src")[0].split("\\").join("/")}public/${
                      nodeSelected.data.elements.filter(
                        item => item.number === elementNowSelected
                      )[0].value
                    }`
                  : `${__dirname
                      .split("dist")[0]
                      .split("\\")
                      .join("/")}public/${
                      nodeSelected.data.elements.filter(
                        item => item.number === elementNowSelected
                      )[0].value
                    }`
            });
            await intervalWhats("1");
          }

          if (elementNowSelected.includes("audio")) {
            const mediaDirectory =
              (await getBackendUrl(companyId)) === "https://localhost:8090"
                ? `${__dirname.split("src")[0].split("\\").join("/")}public/${
                    nodeSelected.data.elements.filter(
                      item => item.number === elementNowSelected
                    )[0].value
                  }`
                : `${__dirname.split("dist")[0].split("\\").join("/")}public/${
                    nodeSelected.data.elements.filter(
                      item => item.number === elementNowSelected
                    )[0].value
                  }`;
            const ticketInt = await Ticket.findOne({
              where: { id: ticket.id }
            });

            await typeSimulation(ticket, "recording");

            await SendWhatsAppMediaFlow({
              media: mediaDirectory,
              ticket: ticketInt,
              isRecord: nodeSelected.data.elements.filter(
                item => item.number === elementNowSelected
              )[0].record
            });
            //fs.unlinkSync(mediaDirectory.split('.')[0] + 'A.mp3');
            await intervalWhats("1");
          }
          if (elementNowSelected.includes("video")) {
            const mediaDirectory =
              (await getBackendUrl(companyId)) === "https://localhost:8090"
                ? `${__dirname.split("src")[0].split("\\").join("/")}public/${
                    nodeSelected.data.elements.filter(
                      item => item.number === elementNowSelected
                    )[0].value
                  }`
                : `${__dirname.split("dist")[0].split("\\").join("/")}public/${
                    nodeSelected.data.elements.filter(
                      item => item.number === elementNowSelected
                    )[0].value
                  }`;
            const ticketInt = await Ticket.findOne({
              where: { id: ticket.id }
            });

            await typeSimulation(ticket, "composing");

            await SendWhatsAppMediaFlow({
              media: mediaDirectory,
              ticket: ticketInt
            });
            //fs.unlinkSync(mediaDirectory.split('.')[0] + 'A.mp3');
            await intervalWhats("1");
          }

          if (
            elementNowSelected.includes("file") ||
            elementNowSelected.includes("doc") ||
            elementNowSelected.includes("arquivo") ||
            elementNowSelected.includes("documento")
          ) {
            const fileValue = nodeSelected.data.elements.filter(
              item => item.number === elementNowSelected
            )[0].value;

            const mediaDirectory = path.join(
              path.resolve(__dirname, "../../.."),
              "public",
              "uploads",
              fileValue
            );

            if (!fs.existsSync(mediaDirectory)) {
              console.error("Arquivo não encontrado:", mediaDirectory);
              continue;
            }

            const ticketInt = await Ticket.findOne({
              where: { id: ticket.id }
            });

            const fileExtension = path.extname(mediaDirectory);
            const fileNameWithoutExtension = path.basename(
              mediaDirectory,
              fileExtension
            );
            const mimeType =
              mime.lookup(mediaDirectory) || "application/octet-stream";

            console.log(
              "Enviando arquivo:",
              fileNameWithoutExtension + fileExtension,
              "com tipo:",
              mimeType
            );

            await typeSimulation(ticket, "composing");

            try {
              await SendWhatsAppMediaFlow({
                media: mediaDirectory,
                ticket: ticketInt
              });
              console.log("Arquivo enviado com sucesso");
            } catch (error) {
              console.error("Erro ao enviar arquivo:", error);
            }

            await intervalWhats("1");
          }
        }
      }

      if (nodeSelected.type === "file") {
        if (!nodeSelected.data.url || nodeSelected.data.url === "undefined") {
          console.error("URL do arquivo não definida no nó do tipo file");
          console.log("nodeSelected.data:", nodeSelected.data);
          continue;
        }

        const mediaDirectory = path.join(
          path.resolve(__dirname, "../../.."),
          "public",
          "uploads",
          nodeSelected.data.url
        );

        const contact = await Contact.findOne({
          where: { number: numberClient, companyId }
        });

        if (!fs.existsSync(mediaDirectory)) {
          console.error("Arquivo não encontrado:", mediaDirectory);
          continue;
        }

        const fileExtension = path.extname(mediaDirectory);

        const fileNameWithoutExtension = path.basename(
          mediaDirectory,
          fileExtension
        );

        await typeSimulation(ticket, "composing");

        try {
          await SendWhatsAppMediaFlow({
            media: mediaDirectory,
            ticket: ticket
          });
          console.log("Arquivo enviado com sucesso");
        } catch (error) {
          console.error("Erro ao enviar arquivo:", error);
        }

        const ticketDetails = await ShowTicketService(ticket.id, companyId);

        await ticketDetails.update({
          lastMessage: formatBody(
            `${fileNameWithoutExtension}${fileExtension}`,
            ticket.contact
          )
        });

        await typeSimulation(ticket, "paused");
      }

            if (nodeSelected.type === "interval") {
        const timerSeconds = parseInt(nodeSelected.data.sec, 10);
        console.log(`Timer dedicado: Iniciando ${timerSeconds} segundos...`);
        
        await new Promise((resolve) => {
          setTimeout(() => {
            console.log(`Timer dedicado: ${timerSeconds} segundos finalizado.`);
            resolve(true);
          }, timerSeconds * 1000);
        });
        
        console.log(`Timer dedicado: Prosseguindo para próximo node...`);
      }

      // Nó: Transferir para outro Fluxo
      if (nodeSelected.type === "transferFlow") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const targetFlowId = nodeSelected.data?.data?.flowId || nodeSelected.data?.flowId;
        
        console.log(`TransferFlow: Dados do nó:`, JSON.stringify(nodeSelected.data, null, 2));
        console.log(`TransferFlow: targetFlowId extraído: ${targetFlowId}`);
        
        if (targetFlowId) {
          console.log(`TransferFlow: Transferindo para fluxo ID ${targetFlowId}`);
          
          const targetFlow = await FlowBuilderModel.findOne({
            where: { id: targetFlowId, company_id: companyId }
          });
          
          if (targetFlow && targetFlow.flow) {
            console.log(`TransferFlow: Fluxo encontrado, processando dados...`);
            const flowData = typeof targetFlow.flow === 'string' 
              ? JSON.parse(targetFlow.flow) 
              : targetFlow.flow;
            
            const newNodes = flowData.nodes || [];
            const newConnects = flowData.connections || [];
            
            console.log(`TransferFlow: Nó encontrados: ${newNodes.length}, Conexões: ${newConnects.length}`);
            
            // Encontrar o nó de início do novo fluxo
            const startNode = newNodes.find((n: any) => n.type === "start");
            
            console.log(`TransferFlow: Nó start encontrado: ${startNode ? startNode.id : 'NÃO'}`);
            
            if (startNode) {
              // Encontrar a conexão que sai do start
              const startConnection = newConnects.find((c: any) => c.source === startNode.id);
              
              console.log(`TransferFlow: Conexão start encontrada: ${startConnection ? startConnection.target : 'NÃO'}`);
              
              if (startConnection) {
                // Gerar novo hash para o novo fluxo
                const newHashFlowId = randomString(42);
                
                console.log(`TransferFlow: Gerando novo hash: ${newHashFlowId}`);
                
                // Atualizar ticket com novo fluxo
                await ticket.update({
                  flowWebhook: true,
                  lastFlowId: startConnection.target,
                  hashFlowId: newHashFlowId,
                  flowStopped: targetFlowId.toString()
                });
                
                console.log(`TransferFlow: Ticket atualizado com sucesso!`);
                
                // Executar o novo fluxo recursivamente
                console.log(`TransferFlow: Executando novo fluxo recursivamente...`);
                await ActionsWebhookService(
                  whatsappId,
                  targetFlowId,
                  companyId,
                  newNodes,
                  newConnects,
                  startConnection.target,
                  dataWebhook,
                  details,
                  newHashFlowId,
                  null, // Limpar pressKey ao transferir para novo fluxo
                  idTicket,
                  {
                    number: numberClient,
                    name: createFieldJsonName,
                    email: ""
                  },
                  msg
                );
                
                console.log(`TransferFlow: Novo fluxo executado com sucesso!`);
                return;
              }
            }
          } else {
            console.log(`TransferFlow: Fluxo ${targetFlowId} não encontrado ou sem dados`);
            if (targetFlow) {
              console.log(`TransferFlow: Fluxo existe mas flow está vazio:`, targetFlow.flow);
            }
          }
        }
      }

      // Nó: Enviar Mensagem API Externa
      if (nodeSelected.type === "sendMessage") {
        console.log(`SendMessage: Processando envio de mensagem via API`);
        
        const messageData = nodeSelected.data?.data || nodeSelected.data;
        const apiToken = messageData?.apiToken;
        const message = messageData?.message;
        const phoneNumber = messageData?.phoneNumber;
        const queueId = messageData?.queueId || "";
        const sendSignature = messageData?.sendSignature || false;
        const closeTicket = messageData?.closeTicket || false;
        
        if (!apiToken || !message || !phoneNumber) {
          console.log(`SendMessage: Dados incompletos - apiToken: ${!!apiToken}, message: ${!!message}, phoneNumber: ${phoneNumber}`);
          return;
        }
        
        try {
          console.log(`SendMessage: Enviando mensagem para ${phoneNumber} via API externa`);
          
          // Buscar informações do contato e ticket para substituir variáveis
          let processedMessage = message;
          
          if (idTicket) {
            const ticket = await Ticket.findOne({
              where: { id: idTicket, companyId },
              include: [
                { model: Contact, as: "contact" },
                { model: User, as: "user" },
                { model: Queue, as: "queue" }
              ]
            });
            
            if (ticket) {
              const contact = ticket.contact;
              const user = ticket.user;
              const queue = ticket.queue;
              
              // Substituir variáveis padrão na mensagem
              processedMessage = message
                .replace(/\{\{name\}\}/g, contact?.name || "")
                .replace(/\{\{firstName\}\}/g, contact?.name?.split(" ")[0] || "")
                .replace(/\{\{userName\}\}/g, user?.name || "")
                .replace(/\{\{ticket_id\}\}/g, ticket.id.toString())
                .replace(/\{\{queue\}\}/g, queue?.name || "")
                .replace(/\{\{protocol\}\}/g, ticket.uuid || "")
                .replace(/\{\{connection\}\}/g, ticket.whatsapp?.name || "");
              
              // Adicionar saudação
              const hour = new Date().getHours();
              let greeting = "Boa madrugada";
              if (hour >= 5 && hour < 12) greeting = "Bom dia";
              else if (hour >= 12 && hour < 18) greeting = "Boa tarde";
              else if (hour >= 18 && hour < 24) greeting = "Boa noite";
              
              processedMessage = processedMessage.replace(/\{\{ms\}\}/g, greeting);
              
              // Adicionar data e hora
              const now = new Date();
              processedMessage = processedMessage
                .replace(/\{\{date\}\}/g, now.toLocaleDateString("pt-BR"))
                .replace(/\{\{hour\}\}/g, now.toLocaleTimeString("pt-BR"));
              
              // Substituir variáveis do dataWebhook (nós de pergunta e API)
              const dataWebhook = ticket?.dataWebhook as any;
              if (dataWebhook) {
                // Variáveis de respostas de perguntas
                if (dataWebhook.questionAnswers) {
                  Object.entries(dataWebhook.questionAnswers).forEach(([key, value]) => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    processedMessage = processedMessage.replace(regex, String(value || ""));
                  });
                }
                
                // Variáveis salvas de APIs e outras fontes
                if (dataWebhook.variables) {
                  Object.entries(dataWebhook.variables).forEach(([key, value]) => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    processedMessage = processedMessage.replace(regex, String(value || ""));
                  });
                }
                
                // Variáveis de estado específicas (ex: respostas recentes)
                if (dataWebhook.questionState && dataWebhook.questionState.answerValue) {
                  const answerKey = dataWebhook.questionState.answerKey;
                  if (answerKey) {
                    const regex = new RegExp(`\\{\\{${answerKey}\\}\\}`, 'g');
                    processedMessage = processedMessage.replace(regex, String(dataWebhook.questionState.answerValue || ""));
                  }
                }
              }
              
              console.log(`SendMessage: Mensagem processada com variáveis: ${processedMessage}`);
              console.log(`SendMessage: Variáveis disponíveis:`, dataWebhook?.variables || {});
              console.log(`SendMessage: Respostas de perguntas:`, dataWebhook?.questionAnswers || {});
            }
          }
          
          // Preparar body da requisição
          const requestBody = {
            number: phoneNumber,
            body: processedMessage,
            userId: "", // Não utilizado conforme solicitado
            queueId: queueId,
            sendSignature: sendSignature,
            closeTicket: closeTicket
          };
          
          // Enviar requisição para API externa
          const response = await fetch("https://api.faedeveloper.com.br/api/messages/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
          }
          
          const responseData = await response.json();
          console.log(`SendMessage: Mensagem enviada com sucesso via API externa`, responseData);
          
        } catch (error) {
          console.error(`SendMessage: Erro ao enviar mensagem via API externa:`, error);
        }
      }

      // Nó: Requisição API
      if (nodeSelected.type === "apiRequest") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const apiData = nodeSelected.data?.data || nodeSelected.data;
        const method = apiData?.method || "GET";
        const url = apiData?.url;
        const headers = apiData?.headers;
        const body = apiData?.body;
        const saveResponse = apiData?.saveResponse;
        const savedVariables = apiData?.savedVariables || [];
        
        if (url) {
          console.log(`ApiRequest: ${method} ${url}`);
          
          try {
            // Substituir variáveis na URL e body
            let processedUrl = url;
            let processedBody = body;
            
            const contact = await Contact.findOne({
              where: { number: numberClient, companyId }
            });
            
            if (contact) {
              const variables: Record<string, string> = {
                "{{name}}": contact.name || "",
                "{{number}}": contact.number || "",
                "{{email}}": contact.email || "",
              };
              
              // Adicionar variáveis do webhook
              if (ticket?.dataWebhook?.variables) {
                Object.entries(ticket.dataWebhook.variables).forEach(([key, value]) => {
                  variables[`{{${key}}}`] = String(value);
                });
              }
              
              Object.entries(variables).forEach(([key, value]) => {
                // Usar split/join para substituição robusta
                processedUrl = processedUrl.split(key).join(value);
                if (processedBody) {
                  processedBody = processedBody.split(key).join(value);
                }
              });
            }
            
            // Parsear headers
            let parsedHeaders = {};
            if (headers) {
              try {
                parsedHeaders = JSON.parse(headers);
              } catch (e) {
                console.log("ApiRequest: Erro ao parsear headers", e);
              }
            }
            
            // Parsear body
            let parsedBody = undefined;
            if (processedBody && ["POST", "PUT", "PATCH"].includes(method)) {
              try {
                parsedBody = JSON.parse(processedBody);
              } catch (e) {
                parsedBody = processedBody;
              }
            }
            
            const response = await axios({
              method: method.toLowerCase(),
              url: processedUrl,
              headers: parsedHeaders,
              data: parsedBody,
              timeout: 30000
            });
            
            console.log(`ApiRequest: Resposta ${response.status}`);
            console.log(`ApiRequest: Salvando ${savedVariables.length} variáveis da resposta`);
            
            // Salvar variáveis extraídas da resposta
            if (savedVariables.length > 0 && ticket) {
              const currentWebhook = ticket.dataWebhook || {};
              const currentVariables = currentWebhook.variables || {};
              const newVariables = {};
              
              savedVariables.forEach(variable => {
                try {
                  // Extrair valor do JSON usando o path
                  const value = getNestedValue(response.data, variable.path);
                  if (value !== undefined) {
                    newVariables[variable.name] = value;
                    console.log(`ApiRequest: Variável ${variable.name} = ${value}`);
                  }
                } catch (error) {
                  console.log(`ApiRequest: Erro ao extrair variável ${variable.path}:`, error);
                }
              });
              
              // Salvar resposta completa se configurado
              if (saveResponse) {
                newVariables[saveResponse] = response.data;
              }
              
              await ticket.update({
                dataWebhook: {
                  ...currentWebhook,
                  variables: {
                    ...currentVariables,
                    ...newVariables
                  }
                }
              });
            }
            // Salvar apenas resposta completa se não tiver variáveis específicas
            else if (saveResponse && ticket) {
              const currentWebhook = ticket.dataWebhook || {};
              const currentVariables = currentWebhook.variables || {};
              
              await ticket.update({
                dataWebhook: {
                  ...currentWebhook,
                  variables: {
                    ...currentVariables,
                    [saveResponse]: response.data
                  }
                }
              });
            }
          } catch (error: any) {
            console.error(`ApiRequest: Erro na requisição`, error.message);
          }
        }
      }

      // Nó: Adicionar Tag (normal)
      if (nodeSelected.type === "addTag") {
        console.log(`=== PROCESSANDO NÓ addTag (TAG NORMAL) ===`);
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const tagData = nodeSelected.data?.data || nodeSelected.data;
        const tagId = tagData?.id;
        
        console.log(`addTag: tagId=${tagId}, ticketId=${ticket?.id}`);
        
        if (tagId && ticket) {
          console.log(`AddTag: Adicionando tag NORMAL ${tagId} ao ticket ${ticket.id}`);
          
          try {
            // Verificar se a tag normal existe (com filtro kanban: 0)
            const tag = await Tag.findOne({
              where: { id: tagId, companyId, kanban: 0 }
            });
            
            console.log(`addTag: Tag NORMAL encontrada:`, tag ? { id: tag.id, name: tag.name, kanban: tag.kanban } : null);
            
            if (tag) {
              // Verificar se a tag já está associada ao ticket
              const existingTag = await TicketTag.findOne({
                where: { ticketId: ticket.id, tagId: tag.id }
              });
              
              console.log(`addTag: Tag já existe?`, existingTag ? 'SIM' : 'NÃO');
              
              if (!existingTag) {
                console.log(`addTag: Criando ContactTag (como o frontend)...`);
                try {
                  // Criar ContactTag diretamente (como o frontend faz)
                  const newContactTag = await ContactTag.create({
                    contactId: ticket.contactId,
                    tagId: tag.id,
                    companyId: companyId
                  });
                  
                  console.log(`addTag: ContactTag criada com ID:`, newContactTag?.id);
                  console.log(`addTag: ContactTag completa:`, JSON.stringify(newContactTag, null, 2));
                  
                  // Também criar TicketTag para consistência
                  const newTicketTag = await TicketTag.create({
                    ticketId: ticket.id,
                    tagId: tag.id
                  });
                  console.log(`addTag: TicketTag criada com ID:`, newTicketTag?.id);
                  console.log(`AddTag: Tag NORMAL "${tag.name}" adicionada com sucesso`);
                  
                } catch (createError: any) {
                  console.error(`addTag: Erro ao criar tags:`, createError.message);
                  console.error(`addTag: Stack:`, createError.stack);
                }
                
                // Emitir evento de atualização
                const io = getIO();
                const ticketUpdated = await ShowTicketService(ticket.id, companyId);
                console.log(`addTag: Ticket atualizado com tags:`, ticketUpdated.tags?.map(t => ({ id: t.id, name: t.name })));
                io.of(String(companyId))
                  .emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket: ticketUpdated
                  });
              } else {
                console.log(`AddTag: Tag NORMAL "${tag.name}" já está associada ao ticket`);
              }
            } else {
              console.log(`AddTag: Tag NORMAL ${tagId} não encontrada`);
            }
          } catch (error: any) {
            console.error(`AddTag: Erro ao adicionar tag NORMAL`, error.message);
            console.error(`AddTag: Stack:`, error.stack);
          }
        }
      }

      // Nó: Adicionar Tag Kanban
      if (nodeSelected.type === "addTagKanban") {
        console.log(`=== PROCESSANDO NÓ addTagKanban (TAG KANBAN) ===`);
        
        // Garantir que o ticket existe com contato incluído
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId },
            include: [{ model: Contact, as: "contact" }]
          });
        } else if (ticket && !ticket.contact) {
          // Se o ticket existe mas não tem contato, buscar com include
          ticket = await Ticket.findOne({
            where: { id: ticket.id, companyId },
            include: [{ model: Contact, as: "contact" }]
          });
        }
        
        const tagData = nodeSelected.data?.data || nodeSelected.data;
        const tagId = tagData?.id;
        
        console.log(`addTagKanban: tagId=${tagId}, ticketId=${ticket?.id}`);
        
        if (tagId && ticket) {
          console.log(`AddTagKanban: Adicionando tag KANBAN ${tagId} ao ticket ${ticket.id}`);
          
          try {
            // Verificar se a tag kanban existe (com filtro kanban: 1)
            const tag = await Tag.findOne({
              where: { id: tagId, companyId, kanban: 1 }
            });
            
            console.log(`addTagKanban: Tag Kanban encontrada:`, tag ? { id: tag.id, name: tag.name, kanban: tag.kanban } : null);
            
            if (tag) {
              // Remover tags kanban anteriores
              const existingKanbanTags = await TicketTag.findAll({
                where: { ticketId: ticket.id },
                include: [{
                  model: Tag,
                  where: { kanban: 1 }
                }]
              });
              
              console.log(`addTagKanban: Removendo ${existingKanbanTags.length} tags kanban anteriores`);
              
              for (const existingTag of existingKanbanTags) {
                await existingTag.destroy();
              }
              
              // Adicionar nova tag kanban
              try {
                console.log(`AddTagKanban: Tentando criar TicketTag com ticketId=${ticket.id}, tagId=${tag.id}`);
                
                const newTicketTag = await TicketTag.create({
                  ticketId: ticket.id,
                  tagId: tag.id
                }, {
                  logging: (sql) => console.log(`AddTagKanban SQL:`, sql)
                });
                
                console.log(`AddTagKanban: TicketTag criado com sucesso`);
                console.log(`AddTagKanban: Chave primária: ticketId=${newTicketTag.ticketId}, tagId=${newTicketTag.tagId}`);
              } catch (error: any) {
                console.error(`AddTagKanban: Erro ao criar TicketTag:`, error.message);
                console.error(`AddTagKanban: Nome do erro:`, error.name);
                console.error(`AddTagKanban: Stack:`, error.stack);
                console.error(`AddTagKanban: Detalhes:`, error);
              }
              
              console.log(`AddTagKanban: Tag KANBAN "${tag.name}" adicionada com sucesso`);
              
              // Enviar mensagem de saudação se configurada
              if (tag.greetingMessageLane && tag.greetingMessageLane.trim() !== "") {
                try {
                  console.log(`AddTagKanban: Tentando enviar mensagem de saudação...`);
                  console.log(`AddTagKanban: ticket existe? ${!!ticket}`);
                  console.log(`AddTagKanban: ticket.contact existe? ${!!ticket?.contact}`);
                  console.log(`AddTagKanban: ticket.whatsappId=${ticket?.whatsappId}`);
                  
                  if (!ticket?.contact) {
                    console.error(`AddTagKanban: ERRO - ticket.contact é null, não é possível enviar mensagem`);
                    console.error(`AddTagKanban: ticket completo:`, JSON.stringify(ticket, null, 2));
                  }
                  
                  const { SendMessage } = await import("../../helpers/SendMessage");
                  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
                  
                  console.log(`AddTagKanban: whatsapp encontrado? ${!!whatsapp}`);
                  
                  if (whatsapp && ticket.contact) {
                    const number = ticket.contact.number;
                    const body = tag.greetingMessageLane;
                    
                    console.log(`AddTagKanban: Enviando mensagem para number=${number}, body="${body}"`);
                    
                    const result = await SendMessage(whatsapp, { 
                      number: number, 
                      body: body 
                    });
                    
                    console.log(`AddTagKanban: Mensagem de saudação enviada com sucesso! Resultado:`, result);
                  } else {
                    console.error(`AddTagKanban: Não foi possível enviar - whatsapp: ${!!whatsapp}, contact: ${!!ticket?.contact}`);
                  }
                } catch (error: any) {
                  console.error(`AddTagKanban: Erro ao enviar mensagem de saudação:`, error.message);
                  console.error(`AddTagKanban: Stack:`, error.stack);
                }
              }
              
              // Executar ações automáticas configuradas na tag
              if (tag.autoActions && Array.isArray(tag.autoActions) && tag.autoActions.length > 0) {
                try {
                  const { ExecuteTagAutoActions } = await import("../ExecuteTagAutoActionsService");
                  await ExecuteTagAutoActions(tag.id, ticket.id, companyId);
                } catch (error: any) {
                  console.error(`AddTagKanban: Erro ao executar ações automáticas:`, error.message);
                }
              }
              
              // Emitir evento de atualização
              const io = getIO();
              const ticketUpdated = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId))
                .emit(`company-${companyId}-ticket`, {
                  action: "update",
                  ticket: ticketUpdated
                });
            } else {
              console.log(`AddTagKanban: Tag KANBAN ${tagId} não encontrada (deve ter kanban=1)`);
            }
          } catch (error: any) {
            console.error(`AddTagKanban: Erro ao adicionar tag KANBAN`, error.message);
          }
        }
      }

      // Nó: Transferir para Fila
      if (nodeSelected.type === "transferQueue") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const queueData = nodeSelected.data?.data || nodeSelected.data;
        const queueId = queueData?.queueId;
        
        if (queueId && ticket) {
          console.log(`TransferQueue: Transferindo ticket ${ticket.id} para fila ${queueId}`);
          
          try {
            // Verificar se a fila existe
            const queue = await ShowQueueService(queueId, companyId);
            
            if (queue) {
              // Atualizar ticket com nova fila
              await UpdateTicketService({
                ticketData: {
                  queueId: queueId,
                  userId: null // Remove usuário ao transferir para fila
                },
                ticketId: ticket.id,
                companyId
              });
              
              // Criar log da transferência
              await CreateLogTicketService({
                ticketId: ticket.id,
                type: "queue",
                queueId: queueId
              });
              
              console.log(`TransferQueue: Ticket transferido para fila ${queue.name}`);
              
              // Emitir evento de atualização
              const io = getIO();
              const ticketUpdated = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId))
                .emit(`company-${companyId}-ticket`, {
                  action: "update",
                  ticket: ticketUpdated
                });
            } else {
              console.log(`TransferQueue: Fila ${queueId} não encontrada`);
            }
          } catch (error: any) {
            console.error(`TransferQueue: Erro ao transferir para fila`, error.message);
          }
        }
      }

      // Nó: Ticket (transferência para fila)
      if (nodeSelected.type === "ticket") {
        console.log(`=== PROCESSANDO NÓ ticket (TRANSFERÊNCIA PARA FILA) ===`);
        console.log(`ticket: nodeSelected.data=`, JSON.stringify(nodeSelected.data, null, 2));
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const ticketData = nodeSelected.data?.data || nodeSelected.data;
        const queueId = ticketData?.id; // O queueId está em .id não .queueId
        
        console.log(`ticket: queueId=${queueId}, ticketId=${ticket?.id}`);
        
        if (queueId && ticket) {
          console.log(`Ticket: Transferindo ticket ${ticket.id} para fila ${queueId}`);
          
          try {
            // Verificar se a fila existe
            const queue = await ShowQueueService(queueId, companyId);
            
            if (queue) {
              console.log(`Ticket: Status ANTES da transferência: ${ticket.status}`);
              
              // Usar a mesma lógica da IA: só atualiza queueId, não remove usuário
              await UpdateTicketService({
                ticketData: { 
                  queueId: queueId,
                  status: "pending" // Mudar status para "aguardando" ao transferir para fila
                },
                ticketId: ticket.id,
                companyId
              });
              
              // Sair do modo fluxo/automação
              await ticket.update({
                flowWebhook: false, // Sair do modo fluxo/automação
                flowStopped: null // Limpar parada do fluxo
              });
              
              // Verificar status após atualização
              const ticketAfterUpdate = await ShowTicketService(ticket.id, companyId);
              console.log(`Ticket: Status DEPOIS da transferência: ${ticketAfterUpdate.status}`);
              
              // Criar log da transferência
              await CreateLogTicketService({
                ticketId: ticket.id,
                type: "queue",
                queueId: queueId
              });
              
              console.log(`Ticket: Ticket transferido para fila ${queue.name} (mantendo usuário)`);
              
              // Emitir evento de atualização
              const io = getIO();
              const ticketUpdated = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId))
                .emit(`company-${companyId}-ticket`, {
                  action: "update",
                  ticket: ticketUpdated
                });
            } else {
              console.log(`Ticket: Fila ${queueId} não encontrada`);
            }
          } catch (error: any) {
            console.error(`Ticket: Erro ao transferir para fila`, error.message);
          }
        }
      }

      // Nó: Transferir para Usuário
      if (nodeSelected.type === "transferUser") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const userData = nodeSelected.data?.data || nodeSelected.data;
        const userId = userData?.userId;
        
        if (userId && ticket) {
          console.log(`TransferUser: Transferindo ticket ${ticket.id} para usuário ${userId}`);
          
          try {
            // Verificar se o usuário existe
            const user = await User.findOne({
              where: { id: userId, companyId }
            });
            
            if (user) {
              // Atualizar ticket com novo usuário
              await UpdateTicketService({
                ticketData: {
                  userId: userId,
                  status: "open" // Mudar status para "open" ao transferir para usuário
                },
                ticketId: ticket.id,
                companyId
              });
              
              // Criar log da transferência
              await CreateLogTicketService({
                ticketId: ticket.id,
                type: "userDefine",
                userId: userId
              });
              
              console.log(`TransferUser: Ticket transferido para usuário ${user.name}`);
              
              // Emitir evento de atualização
              const io = getIO();
              const ticketUpdated = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId))
                .emit(`company-${companyId}-ticket`, {
                  action: "update",
                  ticket: ticketUpdated
                });
              
              // Enviar mensagem de notificação
              const notificationMessage = `Ticket transferido para ${user.name}`;
              await SendWhatsAppMessage({
                body: notificationMessage,
                ticket: ticketUpdated,
                quotedMsg: null
              });
            } else {
              console.log(`TransferUser: Usuário ${userId} não encontrado`);
            }
          } catch (error: any) {
            console.error(`TransferUser: Erro ao transferir para usuário`, error.message);
          }
        }
      }

      // Nó: Adicionar Tag
      if (nodeSelected.type === "addTag") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const tagData = nodeSelected.data?.data || nodeSelected.data;
        const tagId = tagData?.tagId;
        
        if (tagId && ticket) {
          console.log(`addTag: Adicionando tag ${tagId} ao ticket ${ticket.id}`);
          
          try {
            // Verificar se a tag existe
            const tag = await Tag.findOne({
              where: { id: tagId, companyId }
            });
            
            if (tag) {
              // Remover tags anteriores do contato
              await TicketTag.destroy({
                where: { ticketId: ticket.id }
              });
              
              // Adicionar nova tag ao ticket
              await TicketTag.create({
                ticketId: ticket.id,
                tagId: tagId
              });
              
              // Adicionar tag ao contato também
              await ContactTag.create({
                contactId: ticket.contactId,
                tagId: tagId
              });
              
              console.log(`addTag: Tag "${tag.name}" adicionada com sucesso`);
              
              // Emitir evento de atualização
              const io = getIO();
              const ticketUpdated = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId))
                .emit(`company-${companyId}-ticket`, {
                  action: "update",
                  ticket: ticketUpdated
                });
            } else {
              console.log(`addTag: Tag ${tagId} não encontrada`);
            }
          } catch (error: any) {
            console.error(`addTag: Erro ao adicionar tag`, error.message);
          }
        }
      }

      // Nó: Etapa Kanban
      if (nodeSelected.type === "kanbanStage") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const kanbanData = nodeSelected.data?.data || nodeSelected.data;
        const tagId = kanbanData?.tagId;
        
        if (tagId && ticket) {
          console.log(`KanbanStage: Definindo etapa kanban ${tagId} para ticket ${ticket.id}`);
          
          try {
            // Verificar se a tag kanban existe
            const tag = await Tag.findOne({
              where: { id: tagId, companyId, kanban: 1 }
            });
            
            if (tag) {
              // Remover todas as tags kanban anteriores
              const existingKanbanTags = await TicketTag.findAll({
                where: { ticketId: ticket.id },
                include: [{
                  model: Tag,
                  where: { kanban: 1 }
                }]
              });
              
              for (const existingTag of existingKanbanTags) {
                await existingTag.destroy();
              }
              
              // Adicionar nova tag kanban
              await TicketTag.create({
                ticketId: ticket.id,
                tagId: tag.id
              });
              
              console.log(`KanbanStage: Etapa ${tag.name} definida com sucesso`);
              
              // Emitir evento de atualização
              const io = getIO();
              const ticketUpdated = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId))
                .emit(`company-${companyId}-ticket`, {
                  action: "update",
                  ticket: ticketUpdated
                });
            } else {
              console.log(`KanbanStage: Tag kanban ${tagId} não encontrada`);
            }
          } catch (error: any) {
            console.error(`KanbanStage: Erro ao definir etapa kanban`, error.message);
          }
        }
      }

      // Nó: Condição
      let isCondition: boolean = false;
      const normalizeVariableKey = (rawValue?: string) => {
        if (!rawValue) return "";
        return rawValue.replace(/^[\s{]+/, "").replace(/[\s}]+$/, "").trim();
      };

      if (nodeSelected.type === "condition") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const conditionData = nodeSelected.data?.data || nodeSelected.data;
        const key = conditionData?.key;
        const normalizedKey = normalizeVariableKey(key);
        const condition = conditionData?.condition;
        const value = conditionData?.value;
        
        console.log(`Condition: Avaliando ${normalizedKey || key} ${condition} ${value}`);
        
        // Obter valor da variável
        let variableValue: any = "";
        
        if (ticket?.dataWebhook?.variables) {
          if (normalizedKey && ticket.dataWebhook.variables[normalizedKey] !== undefined) {
            variableValue = ticket.dataWebhook.variables[normalizedKey];
          } else if (key && ticket.dataWebhook.variables[key] !== undefined) {
            variableValue = ticket.dataWebhook.variables[key];
          }
        }
        
        // Avaliar condição
        let conditionResult = false;
        
        switch (parseInt(condition)) {
          case 1: // ==
            conditionResult = String(variableValue) === String(value);
            break;
          case 6: // contains (substring)
            conditionResult = String(variableValue || "")
              .toLowerCase()
              .includes(String(value || "").toLowerCase());
            break;
          case 2: // >=
            conditionResult = parseFloat(variableValue) >= parseFloat(value);
            break;
          case 3: // <=
            conditionResult = parseFloat(variableValue) <= parseFloat(value);
            break;
          case 4: // <
            conditionResult = parseFloat(variableValue) < parseFloat(value);
            break;
          case 5: // >
            conditionResult = parseFloat(variableValue) > parseFloat(value);
            break;
          default:
            conditionResult = String(variableValue) === String(value);
        }
        
        console.log(`Condition: Resultado = ${conditionResult}`);
        
        // Encontrar a conexão correta baseada no resultado
        const resultConnect = connects.filter(
          connect => connect.source === nodeSelected.id
        );
        
        if (conditionResult) {
          // Caminho "true" (Sim)
          const trueConnection = resultConnect.find(item => item.sourceHandle === "true");
          if (trueConnection) {
            next = trueConnection.target;
            noAlterNext = true;
          }
        } else {
          // Caminho "false" (Não)
          const falseConnection = resultConnect.find(item => item.sourceHandle === "false");
          if (falseConnection) {
            next = falseConnection.target;
            noAlterNext = true;
          }
        }
        
        isCondition = true;
      }

      // Nó: Condição de Palavra-chave
      let isKeywordCondition: boolean = false;
      if (nodeSelected.type === "keywordCondition") {
        isKeywordCondition = true;
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const keywordData = nodeSelected.data?.data || nodeSelected.data;
        const keywords = keywordData?.keywords || [];
        const caseSensitive = keywordData?.caseSensitive || false;
        const ignoreAccents = keywordData?.ignoreAccents || false;
        
        console.log(`KeywordCondition: Avaliando ${keywords.length} palavras-chave`);
        
        // Obter mensagem do usuário
        let userMessage = "";
        if (ticket?.dataWebhook?.variables?.message) {
          userMessage = ticket.dataWebhook.variables.message;
        } else if (ticket?.dataWebhook?.variables?.userMessage) {
          userMessage = ticket.dataWebhook.variables.userMessage;
        } else if (ticket?.lastMessage) {
          userMessage = ticket.lastMessage;
        }
        
        if (!userMessage && ticket?.contact?.lastMessage) {
          userMessage = ticket.contact.lastMessage;
        }
        
        if (userMessage) {
          // Preparar texto para comparação
          let searchText = String(userMessage).trim();
          
          if (!caseSensitive) {
            searchText = searchText.toLowerCase();
          }
          
          if (ignoreAccents) {
            // Função simples para remover acentos
            const removeAccents = (text) => {
              return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            };
            searchText = removeAccents(searchText);
          }
          
          let matchedKeyword = null;
          let matchedIndex = -1;
          
          // Verificar cada palavra-chave em ordem
          console.log(`KeywordCondition: Avaliando ${keywords.length} palavras-chave:`, keywords.map(k => k.text));
          for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            if (!keyword.text) continue;
            
            let searchKeyword = String(keyword.text).trim();
            
            if (!caseSensitive) {
              searchKeyword = searchKeyword.toLowerCase();
            }
            
            if (ignoreAccents) {
              searchKeyword = searchKeyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            }
            
            let keywordMatched = false;
            
            console.log(`KeywordCondition: Comparando - Texto: "${searchText}" | Palavra-chave: "${searchKeyword}" | caseSensitive: ${caseSensitive} | ignoreAccents: ${ignoreAccents}`);
            
            try {
              switch (parseInt(keyword.matchType)) {
                case 1: // Exato
                  keywordMatched = searchText === searchKeyword;
                  break;
                case 2: // Contém
                  keywordMatched = searchText.includes(searchKeyword);
                  break;
                case 3: // Começa com
                  keywordMatched = searchText.startsWith(searchKeyword);
                  break;
                case 4: // Termina com
                  keywordMatched = searchText.endsWith(searchKeyword);
                  break;
                case 5: // RegEx
                  try {
                    const regex = new RegExp(searchKeyword, caseSensitive ? 'g' : 'gi');
                    keywordMatched = regex.test(searchText);
                  } catch (regexError) {
                    console.error(`KeywordCondition: Erro na expressão regular: ${regexError.message}`);
                    keywordMatched = false;
                  }
                  break;
                default:
                  keywordMatched = searchText.includes(searchKeyword);
              }
              console.log(`KeywordCondition: Resultado: ${keywordMatched} (matchType: ${keyword.matchType})`);
            } catch (error) {
              console.error(`KeywordCondition: Erro na avaliação: ${error.message}`);
              keywordMatched = false;
            }
            
            if (keywordMatched) {
              matchedKeyword = keyword;
              matchedIndex = i;
              break; // Para na primeira correspondência
            }
          }
          
          // Encontrar a conexão correta baseada no resultado
          const resultConnect = connects.filter(
            connect => connect.source === nodeSelected.id
          );
          
          if (matchedKeyword && matchedIndex >= 0) {
            // Caminho para a palavra-chave correspondente
            console.log(`KeywordCondition: Procurando conexão para keyword_${matchedIndex}`);
            console.log(`KeywordCondition: Conexões disponíveis:`, resultConnect.map(c => ({ sourceHandle: c.sourceHandle, target: c.target })));
            const keywordConnection = resultConnect.find(item => item.sourceHandle === `keyword_${matchedIndex}`);
            if (keywordConnection) {
              next = keywordConnection.target;
              console.log(`KeywordCondition: Direcionando para fluxo da palavra-chave "${matchedKeyword.text}" (índice ${matchedIndex}) → ${keywordConnection.target}`);
            } else {
              console.log(`KeywordCondition: Nenhuma conexão encontrada para keyword_${matchedIndex}`);
            }
          } else {
            // Caminho padrão (nenhuma correspondência)
            const defaultConnection = resultConnect.find(item => item.sourceHandle === "default");
            if (defaultConnection) {
              next = defaultConnection.target;
              noAlterNext = true;
              console.log(`KeywordCondition: Nenhuma palavra-chave encontrada, usando fluxo padrão`);
            }
          }
        } else {
          console.log(`KeywordCondition: Nenhuma mensagem encontrada para avaliação`);
        }
        console.log(`KeywordCondition: Próximo nó definido como: ${next}`);
        console.log(`KeywordCondition: Indo para próxima iteração do loop principal...`);
        // REMOVIDO: break para permitir continuar para o próximo nó
      }

      console.log(`=== APÓS KEYWORDCONDITION - Verificando se continua o loop ===`);
      console.log(`=== Valores atuais: next=${next}, isKeywordCondition=${isKeywordCondition} ===`);

      // Nó: 2ª Via Boleto Asaas
      let isAsaas: boolean = false;
      if (nodeSelected.type === "asaas") {
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        const asaasData = nodeSelected.data?.data || nodeSelected.data;
        const message = asaasData?.message || "Por favor, informe seu CPF para buscarmos seu boleto:";
        const successMessage = asaasData?.successMessage || "Encontramos seu boleto! Enviando os dados...";
        const errorMessage = asaasData?.errorMessage || "Desculpe, não encontramos nenhum boleto pendente para este CPF.";
        
        console.log(`Asaas: Iniciando fluxo de 2ª via de boleto`);
        
        const currentWebhookData = ticket?.dataWebhook || {};
        const asaasState = currentWebhookData?.asaasState || {};
        const awaitingCpf =
          asaasState?.awaiting === true &&
          asaasState?.nodeId === nodeSelected.id;

        if (!awaitingCpf) {
          // Enviar mensagem solicitando CPF e marcar estado de espera
          await SendMessageFlow(
            whatsapp,
            {
              number: numberClient,
              body: message
            },
            ticket?.id,
            ticket
          );

          if (ticket) {
            const updatedWebhook = { ...currentWebhookData, asaasState: { awaiting: true, nodeId: nodeSelected.id } };
            await ticket.update({
              queueId: ticket.queueId ? ticket.queueId : null,
              userId: null,
              companyId: companyId,
              flowWebhook: true,
              lastFlowId: nodeSelected.type === "directOpenai" ? ticket.lastFlowId : nodeSelected.id,
              dataWebhook: updatedWebhook,
              hashFlowId: hashWebhookId,
              flowStopped: idFlowDb.toString()
            });
            ticket.dataWebhook = updatedWebhook;
          }

          console.log(`Asaas: Aguardando CPF do cliente`);
          break;
        }

       
        
        if (pressKey && pressKey !== "999") {
          // Cliente respondeu com o CPF
          const cpf = pressKey.replace(/\D/g, ''); // Remove caracteres não numéricos
          console.log(`Asaas: CPF recebido: ${cpf}`);
          
          const resultConnect = connects.filter(
            connect => connect.source === nodeSelected.id
          );
          
          try {
            const boletoData = await getAsaasSecondCopyByCpf(companyId, cpf);
            if (ticket?.dataWebhook?.asaasState) {
              const updatedWebhook = { ...(ticket.dataWebhook || {}) };
              delete updatedWebhook.asaasState;
              await ticket.update({ dataWebhook: updatedWebhook });
              ticket.dataWebhook = updatedWebhook;
            }
            
            // Não enviar mensagem de sucesso aqui, apenas o resumo abaixo
            // await SendMessageFlow(whatsapp, {
            //   number: numberClient,
            //   body: successMessage
            // }, ticket?.id, ticket);
            
            const boletoFileSources = [
              boletoData.invoicePdfUrl,
              boletoData.bankSlipUrl,
              boletoData.invoiceUrl
            ].filter(Boolean);

            const boletoLink = boletoFileSources[0] || null;
            const boletoFileSource = boletoLink;
            const wbot = getWbot(whatsapp.id);
            const contactNumber = `${ticket?.contact?.number || numberClient}${
              ticket?.isGroup ? "@g.us" : "@s.whatsapp.net"
            }`;
            
            // Enviar PDF do boleto se disponível
            if (boletoFileSource) {
              try {
                console.log(`Asaas: Tentando enviar PDF do boleto: ${boletoFileSource}`);
                
                const { buffer: pdfBuffer, contentType } = await fetchPdfBufferFromUrl(
                  boletoFileSource
                );
                
                const fileName = `boleto-${boletoData.paymentId || "asaas"}.pdf`;
                
                // Garantir mimetype compatível com Android
                const mimetype = "application/pdf";
                
                console.log(`Asaas: Enviando PDF - Tamanho: ${pdfBuffer.length} bytes, ContentType: ${mimetype}`);
                
                const messagePayload = {
                  document: pdfBuffer,
                  fileName,
                  mimetype
                };
                
                await wbot.sendMessage(contactNumber, messagePayload);
                console.log(`Asaas: PDF enviado com sucesso`);
                
              } catch (pdfError: any) {
                console.error(`Asaas: Erro ao enviar PDF do boleto`, pdfError.message);
                
                // Fallback: enviar link do boleto se PDF falhar
                try {
                  console.log(`Asaas: Enviando link do boleto como fallback`);
                  await wbot.sendMessage(contactNumber, {
                    text: `📄 Boleto - Vencimento: ${boletoData.dueDate || "N/A"} - Valor: R$ ${
                      boletoData.value?.toFixed(2) || "0.00"
                    }\n\n🔗 Link para o boleto: ${boletoFileSource}\n\n💡 Copie e cole o link no navegador para baixar o PDF.`
                  });
                } catch (linkError: any) {
                  console.error(`Asaas: Erro ao enviar link do boleto`, linkError.message);
                }
              }
            }
            
            // Enviar mensagem curta com código PIX e link
            const pixMessage = [];
            if (boletoData.pixCopyPaste) {
              pixMessage.push(`💠 PIX: ${boletoData.pixCopyPaste}`);
            }
            if (boletoLink) {
              pixMessage.push(`🔗 Link: ${boletoLink}`);
            }
            
            if (pixMessage.length > 0) {
              await SendMessageFlow(whatsapp, {
                number: numberClient,
                body: pixMessage.join('\n')
              }, ticket?.id, ticket);
            }
            
            // Enviar imagem do QR Code PIX se disponível
            if (boletoData.pixQrCodeImage) {
              try {
                const imageBuffer = Buffer.from(boletoData.pixQrCodeImage, "base64");
                await wbot.sendMessage(contactNumber, {
                  image: imageBuffer
                });
              } catch (err) {
                console.error("Asaas: Falha ao enviar imagem do QR Code PIX", err);
              }
            }
            
            console.log(`Asaas: Boleto enviado com sucesso`);
            
            // Seguir caminho de sucesso
            const successConnection = resultConnect.find(item => item.sourceHandle === "success");
            if (successConnection) {
              next = successConnection.target;
              noAlterNext = true;
            }
            pressKey = "999";
          } catch (error: any) {
            console.error(`Asaas: Erro ao buscar boleto`, error.message);
            if (ticket?.dataWebhook?.asaasState) {
              const updatedWebhook = { ...(ticket.dataWebhook || {}) };
              delete updatedWebhook.asaasState;
              await ticket.update({ dataWebhook: updatedWebhook });
              ticket.dataWebhook = updatedWebhook;
            }
            
            // Enviar mensagem de erro
            await SendMessageFlow(whatsapp, {
              number: numberClient,
              body: errorMessage
            }, ticket?.id, ticket);
            
            // Seguir caminho de erro
            const errorConnection = resultConnect.find(item => item.sourceHandle === "error");
            if (errorConnection) {
              next = errorConnection.target;
              noAlterNext = true;
            }
            pressKey = "999";
          }
          
          isAsaas = true;
        } else {
          // Aguardando resposta do cliente - pausar fluxo
          console.log(`Asaas: Aguardando CPF do cliente`);
          break;
        }
      }

      let isRandomizer: boolean;
      if (nodeSelected.type === "randomizer") {
        const selectedRandom = randomizarCaminho(
          nodeSelected.data.percent / 100
        );

        const resultConnect = connects.filter(
          connect => connect.source === nodeSelected.id
        );
        if (selectedRandom === "A") {
          next = resultConnect.filter(item => item.sourceHandle === "a")[0]
            .target;
          noAlterNext = true;
        } else {
          next = resultConnect.filter(item => item.sourceHandle === "b")[0]
            .target;
          noAlterNext = true;
        }
        isRandomizer = true;
      }

      // Nó: Envio de Email SMTP
      if (nodeSelected.type === "smtp") {
        console.log("SMTP: Iniciando envio de email");
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
        }
        
        if (!ticket) {
          console.log("SMTP: Ticket não encontrado");
          break;
        }
        
        const smtpConfig = nodeSelected.data?.smtpConfig || {};
        const emailConfig = nodeSelected.data?.emailConfig || {};
        
        // Obter conexões para caminhos de erro
        const resultConnect = connects.filter(
          connect => connect.source === nodeSelected.id
        );
        
        // Extrair variáveis do dataWebhook
        const variables = ticket?.dataWebhook?.variables || {};
        console.log("SMTP: Variáveis disponíveis:", variables);
        
        // Formatar mensagem com variáveis
        let emailBody = emailConfig?.content || emailConfig?.body || "";
        let emailSubject = emailConfig?.subject || "";
        let recipientEmail = emailConfig?.to || "";
        
        // Substituir variáveis no conteúdo
        console.log("SMTP: Antes da substituição - recipientEmail:", JSON.stringify(recipientEmail));
        console.log("SMTP: Variáveis disponíveis:", JSON.stringify(variables));
        
        Object.keys(variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          const value = variables[key];
          console.log(`SMTP: Substituindo ${placeholder} por ${value}`);
          console.log(`SMTP: recipientEmail antes: ${JSON.stringify(recipientEmail)}`);
          
          // Verificar se o placeholder existe na string
          if (recipientEmail.includes(placeholder)) {
            console.log(`SMTP: Placeholder ${placeholder} encontrado!`);
            // Usar replaceAll em vez de replace com regex para evitar problemas
            recipientEmail = recipientEmail.split(placeholder).join(value);
            console.log(`SMTP: recipientEmail depois: ${JSON.stringify(recipientEmail)}`);
          } else {
            console.log(`SMTP: Placeholder ${placeholder} NÃO encontrado em ${JSON.stringify(recipientEmail)}`);
          }
          
          emailBody = emailBody.split(placeholder).join(value);
          emailSubject = emailSubject.split(placeholder).join(value);
        });
        console.log("SMTP: Após substituição - recipientEmail:", JSON.stringify(recipientEmail));
        
        console.log("SMTP: Enviando email para:", recipientEmail);
        console.log("SMTP: Assunto:", emailSubject);
        
        try {
          // Importar serviço de email
          const nodemailer = require('nodemailer');
          
          // Configurar transporter - MÉTODO CORRETO: createTransport
          const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port || 587,
            secure: smtpConfig.useTLS || false, // usar useTLS do formulário
            auth: {
              user: smtpConfig.username, // usar username do formulário
              pass: smtpConfig.password  // usar password do formulário
            }
          });
          
          // Enviar email
          await transporter.sendMail({
            from: smtpConfig.fromEmail || smtpConfig.username, // usar fromEmail do formulário
            to: recipientEmail,
            subject: emailSubject,
            html: emailBody,
            text: emailBody.replace(/<[^>]*>/g, '') // Versão texto
          });
          
          console.log("SMTP: Email enviado com sucesso");
          
          // Enviar confirmação para o WhatsApp - VERIFICAR SE EXISTE CONTACT
          if (ticket && ticket.contact && ticket.contact.number) {
            const confirmationMessage = `✅ Email enviado com sucesso para ${recipientEmail}`;
            await SendMessageFlow(whatsapp, {
              number: `${ticket.contact.number}@s.whatsapp.net`,
              body: confirmationMessage
            }, ticket?.id, ticket);
          } else {
            console.log("SMTP: Contact não disponível para enviar confirmação");
          }
          
        } catch (error) {
          console.error("SMTP: Erro ao enviar email:", error);
          
          // Enviar mensagem de erro para o WhatsApp - VERIFICAR SE EXISTE CONTACT
          if (ticket && ticket.contact && ticket.contact.number) {
            const errorMessage = `❌ Falha ao enviar email. Tente novamente mais tarde.`;
            await SendMessageFlow(whatsapp, {
              number: `${ticket.contact.number}@s.whatsapp.net`,
              body: errorMessage
            }, ticket?.id, ticket);
          } else {
            console.log("SMTP: Contact não disponível para enviar mensagem de erro");
          }
          
          // Seguir caminho de erro se existir
          const errorConnection = resultConnect.find(item => item.sourceHandle === "error");
          if (errorConnection) {
            next = errorConnection.target;
            noAlterNext = true;
          }
        }
      }

      // Nó: Encerrar Ticket
      if (nodeSelected.type === "closeTicket") {
        console.log(`=== PROCESSANDO NÓ closeTicket (ENCERRAR TICKET) ===`);
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: {
              id: idTicket,
              whatsappId: whatsappId,
              companyId: companyId
            }
          });
        }

        // Nó: Google Sheets
        if (nodeSelected.type === "googleSheets") {
          console.log("GoogleSheets: Iniciando operação");
          
          // Garantir que o ticket existe
          if (!ticket && idTicket) {
            ticket = await ShowTicketService(idTicket, companyId);
          }
          
          if (!ticket) {
            console.log("GoogleSheets: Ticket não encontrado");
            break;
          }
          
          const sheetsConfig = nodeSelected.data?.sheetsConfig || {};
          const operation = nodeSelected.data?.operation || "list";
          
          // Obter conexões para caminhos de erro
          const resultConnect = connects.filter(
            (connect) => connect.source === nodeSelected.id && connect.sourceHandle === "error"
          );
          
          // Extrair variáveis do dataWebhook
          const variables = ticket?.dataWebhook?.variables || {};
          console.log("GoogleSheets: Variáveis disponíveis:", variables);
          
          try {
            // Importar serviço Google Sheets
            const GoogleSheetsService = require("../GoogleSheetsService").default;
            const sheetsService = new GoogleSheetsService();
            
            let result;
            
            switch (operation) {
              case "list":
                result = await sheetsService.listData(sheetsConfig, variables);
                break;
                
              case "add":
                result = await sheetsService.addRow(sheetsConfig, nodeSelected.data?.rowData || {}, variables);
                break;
                
              case "edit":
                result = await sheetsService.editRow(
                  sheetsConfig, 
                  nodeSelected.data?.searchColumn || "",
                  nodeSelected.data?.searchValue || "",
                  nodeSelected.data?.rowData || {},
                  variables
                );
                break;
                
              case "delete":
                result = await sheetsService.deleteRow(
                  sheetsConfig,
                  nodeSelected.data?.searchColumn || "",
                  nodeSelected.data?.searchValue || "",
                  variables
                );
                break;
                
              case "search":
                result = await sheetsService.searchData(
                  sheetsConfig,
                  nodeSelected.data?.searchColumn || "",
                  nodeSelected.data?.searchValue || "",
                  variables
                );
                break;
                
              default:
                throw new Error(`Operação "${operation}" não suportada`);
            }
            
            console.log("GoogleSheets: Operação executada com sucesso:", result);
            
            // Armazenar resultado na variável de saída se especificada
            const outputVariable = nodeSelected.data?.outputVariable;
            if (outputVariable && ticket?.dataWebhook) {
              ticket.dataWebhook.variables[outputVariable] = JSON.stringify(result);
              await ticket.save();
            }
            
            // Enviar confirmação para o WhatsApp
            if (ticket && ticket.contact && ticket.contact.number) {
              const confirmationMessage = `✅ Operação "${operation}" no Google Sheets executada com sucesso!`;
              await SendMessageFlow(whatsapp, {
                number: `${ticket.contact.number}@s.whatsapp.net`,
                body: confirmationMessage
              }, ticket?.id, ticket);
            }
            
          } catch (error) {
            console.error("GoogleSheets: Erro na operação:", error);
            
            // Enviar mensagem de erro para o WhatsApp
            if (ticket && ticket.contact && ticket.contact.number) {
              const errorMessage = `❌ Erro na operação do Google Sheets: ${error.message}`;
              await SendMessageFlow(whatsapp, {
                number: `${ticket.contact.number}@s.whatsapp.net`,
                body: errorMessage
              }, ticket?.id, ticket);
            }
            
            // Seguir caminho de erro se existir
            if (resultConnect.length > 0) {
              const nextNode = nodes.find(
                (node) => node.id === resultConnect[0].target
              );
              if (nextNode) {
                await ActionsWebhookService(
                  whatsappId,
                  idFlowDb,
                  companyId,
                  nodes,
                  connects,
                  nextNode.id,
                  dataWebhook,
                  details,
                  hashWebhookId,
                  pressKey,
                  idTicket,
                  numberPhrase,
                  msg
                );
              }
            }
            
            break;
          }
        }

        if (ticket) {
          // Enviar mensagem de encerramento se configurada
          const message = nodeSelected.data?.message;
          if (message) {
            console.log(`closeTicket: Enviando mensagem de encerramento: ${message}`);
            
            // Substituir variáveis na mensagem
            let processedMessage = message;
            const contact = await Contact.findOne({
              where: { number: numberClient, companyId }
            });
            
            if (contact) {
              const variables: Record<string, string> = {
                "{{name}}": contact.name || "",
                "{{number}}": contact.number || "",
                "{{email}}": contact.email || "",
              };
              
              // Adicionar variáveis do webhook
              if (ticket?.dataWebhook?.variables) {
                Object.entries(ticket.dataWebhook.variables).forEach(([key, value]) => {
                  variables[`{{${key}}}`] = String(value);
                });
              }
              
              Object.entries(variables).forEach(([key, value]) => {
                processedMessage = processedMessage.split(key).join(value);
              });
            }
            
            // Enviar mensagem
            const wbot = getWbot(whatsapp.id);
            await wbot.sendMessage(`${numberClient}@s.whatsapp.net`, {
              text: processedMessage
            });
            
            // Criar registro da mensagem
            const messageData: MessageData = {
              wid: randomString(50),
              ticketId: ticket.id,
              body: processedMessage,
              fromMe: true,
              read: true
            };
            await CreateMessageService({ messageData: messageData, companyId });
          }
          
          // Encerrar o ticket
          console.log(`closeTicket: Encerrando ticket ${ticket.id}`);
          console.log(`closeTicket: Status antes: ${ticket.status}`);
          
          // Tentar método alternativo direto
          console.log(`closeTicket: Tentando método alternativo...`);
          ticket.status = "closed";
          ticket.queueId = null;
          ticket.userId = null;
          ticket.flowWebhook = true;
          ticket.lastFlowId = nodeSelected.type === "directOpenai" ? ticket.lastFlowId : nodeSelected.id;
          ticket.hashFlowId = hashWebhookId;
          ticket.flowStopped = idFlowDb.toString();
          
          await ticket.save();
          
          // Forçar reload para verificar
          await ticket.reload();
          console.log(`closeTicket: Status depois: ${ticket.status}`);
          console.log(`closeTicket: Ticket ${ticket.id} encerrado com sucesso`);
          
          // Emitir WebSocket para atualizar frontend
          const io = getIO();
          const ticketUpdated = await ShowTicketService(ticket.id, companyId);
          io.of(String(companyId))
            .emit(`company-${companyId}-ticket`, {
              action: "update",
              ticket: ticketUpdated
            });
          
          console.log(`closeTicket: WebSocket emitido para ticket ${ticket.id}`);
        }
      }

      // Nó: Lista de Produtos
      if (nodeSelected.type === "productList") {
        console.log(`=== PROCESSANDO NÓ productList (LISTA DE PRODUTOS) ===`);
        
        // Garantir que o ticket existe
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId }
          });
        }
        
        if (!ticket) {
          console.error("productList: Ticket não encontrado");
          return;
        }

        try {
          const title = nodeSelected.data.title || "🛍️ Nossos Produtos e Serviços";
          const listType = nodeSelected.data.listType || "all";
          const displayType = nodeSelected.data.displayType || "standard";
          const selectedItems = nodeSelected.data.selectedItems || [];
          
          console.log(`productList: Título="${title}", Tipo=${listType}, Display=${displayType}, Itens selecionados=${selectedItems.length}`);
          
          // Buscar produtos diretamente do banco
          let products = [];
          if (listType === "all" || selectedItems.some(id => id.startsWith("product_"))) {
            const Produto = require("../../models/Produto").default;
            products = await Produto.findAll({ 
              where: { companyId: ticket.companyId },
              order: [['nome', 'ASC']]
            });
          }
          
          // Buscar serviços diretamente do banco
          let services = [];
          if (listType === "all" || selectedItems.some(id => id.startsWith("service_"))) {
            const Servico = require("../../models/Servico").default;
            services = await Servico.findAll({ 
              where: { companyId: ticket.companyId },
              order: [['nome', 'ASC']]
            });
          }
          
          // Montar mensagem com título personalizado
          let message = `${title}\n\n`;
          
          // Adicionar produtos
          const filteredProducts = listType === "all" 
            ? products 
            : products.filter(p => selectedItems.includes(`product_${p.id}`));
            
          if (filteredProducts.length > 0) {
            message += "*📦 Produtos:*\n";
            filteredProducts.forEach((product, index) => {
              const name = product.nome || "Produto sem nome";
              const price = product.valor ? `R$ ${parseFloat(product.valor).toFixed(2)}` : "Preço não definido";
              message += `${index + 1}. ${name} - ${price}\n`;
            });
            message += "\n";
          }
          
          // Adicionar serviços
          const filteredServices = listType === "all" 
            ? services 
            : services.filter(s => selectedItems.includes(`service_${s.id}`));
            
          if (filteredServices.length > 0) {
            message += "*🔧 Serviços:*\n";
            filteredServices.forEach((service, index) => {
              const name = service.nome || "Serviço sem nome";
              let price = "Preço não definido";
              
              if (service.valorOriginal) {
                price = `R$ ${parseFloat(service.valorOriginal).toFixed(2)}`;
              }
              
              message += `${index + 1}. ${name} - ${price}\n`;
            });
          }
          
          if (filteredProducts.length === 0 && filteredServices.length === 0) {
            message = "🛍️ No momento não temos produtos ou serviços disponíveis.";
          }
          
          // Enviar mensagem baseado no tipo de exibição
          if (displayType === "carousel") {
            // Modo carrossel nativo do WhatsApp
            console.log("productList: Enviando como carrossel nativo");
            
            // Preparar cards para o carrossel
            const carouselCards = [];
            
            // Imagem padrão para produtos sem imagem
            const defaultImage = "https://via.placeholder.com/400x300/3b82f6/ffffff?text=Produto";
            
            // Adicionar produtos
            for (const product of filteredProducts) {
              const name = product.nome || "Produto sem nome";
              const price = product.valor ? `R$ ${parseFloat(product.valor).toFixed(2)}` : "Preço não definido";
              const desc = product.descricao || "";
              const image = product.imagem_principal || defaultImage;
              const link = product.linkCompra || "";
              
              carouselCards.push({
                title: name,
                description: desc,
                price: price,
                image: image,
                button: link
                  ? {
                      text: "Comprar",
                      value: link
                    }
                  : {
                      text: "Ver Detalhes",
                      value: `produto_${product.id}`
                    }
              });
            }
            
            // Adicionar serviços (com imagem padrão)
            for (const service of filteredServices) {
              const name = service.nome || "Serviço sem nome";
              let price = "Preço não definido";
              
              if (service.valorOriginal) {
                price = `R$ ${parseFloat(service.valorOriginal).toFixed(2)}`;
              }
              
              carouselCards.push({
                title: name,
                description: service.descricao || "",
                price: price,
                image: defaultImage,
                button: {
                  text: "Ver Detalhes",
                  value: `servico_${service.id}`
                }
              });
            }
            
            console.log(`productList: ${carouselCards.length} cards preparados para carrossel`);
            
            // Verificar se temos pelo menos 2 cards
            if (carouselCards.length >= 2) {
              // Enviar carrossel nativo
              await SendCarouselWithFallback({
                ticket,
                title,
                cards: carouselCards
              });
            } else {
              console.log(`productList: Apenas ${carouselCards.length} cards (mínimo 2), usando lista padrão`);
              // Fallback para lista padrão se não tiver cards suficientes
              await SendMessage(whatsapp, {
                number: numberClient,
                body: message
              });
              await intervalWhats("1");
            }
            
          } else {
            // Modo padrão - enviar como lista única
            console.log("productList: Enviando como lista padrão");
            
            await SendMessage(whatsapp, {
              number: numberClient,
              body: message
            });
            
            await intervalWhats("1");
          }
          
          console.log(`productList: Mensagem enviada com ${filteredProducts.length} produtos e ${filteredServices.length} serviços`);
          
        } catch (error) {
          console.error("productList: Erro ao processar lista de produtos:", error);
          
          await SendMessage(whatsapp, {
            number: numberClient,
            body: "❌ Ocorreu um erro ao carregar nossos produtos. Tente novamente mais tarde."
          });
        }
      }

      // Nó: Listar Agendas (Menu Interativo)
      if (nodeSelected.type === "listSchedules") {
        console.log(`=== PROCESSANDO NÓ listSchedules (MENU DE AGENDAS) ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId }
          });
        }
        
        if (!ticket) {
          console.error("listSchedules: Ticket não encontrado");
          continue;
        }

        try {
          const ScheduleAppointmentService = require("../ScheduleServices/ScheduleAppointmentService").default;
          
          const messageText = nodeSelected.data.messageText || "📋 Escolha uma agenda:";
          const activeOnly = nodeSelected.data.activeOnly !== undefined ? nodeSelected.data.activeOnly : true;
          const maxSchedules = nodeSelected.data.maxSchedules || 10;
          
          // Buscar agendas
          const result = await ScheduleAppointmentService({
            action: "list_user_schedules",
            companyId: ticket.companyId,
            activeOnly
          });

          if (!result.success || !result.data || result.data.length === 0) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: "❌ Nenhuma agenda disponível no momento."
            });
            continue;
          }

          const schedules = result.data.slice(0, maxSchedules);
          
          // Enviar como lista numerada
          let listMessage = `${messageText}\n\n`;
          schedules.forEach((schedule: any, index: number) => {
            listMessage += `${index + 1}. ${schedule.name} - ${schedule.user}\n`;
          });
          listMessage += `\nDigite o número da agenda desejada (1-${schedules.length})`;

          await SendMessage(whatsapp, {
            number: numberClient,
            body: listMessage
          });

          // Aguardar resposta do cliente
          if (pressKey) {
            const selectedIndex = parseInt(pressKey);
            
            if (selectedIndex >= 1 && selectedIndex <= schedules.length) {
              const selectedSchedule = schedules[selectedIndex - 1];
              
              // Salvar variáveis no ticket
              if (!ticket.dataWebhook) ticket.dataWebhook = {};
              ticket.dataWebhook.selected_schedule_id = selectedSchedule.id;
              ticket.dataWebhook.selected_schedule_name = selectedSchedule.name;
              ticket.dataWebhook.selected_schedule_user = selectedSchedule.user;
              await ticket.save();
            }
          }
          
        } catch (error) {
          console.error("listSchedules: Erro ao processar:", error);
          await SendMessage(whatsapp, {
            number: numberClient,
            body: "❌ Erro ao carregar agendas. Tente novamente."
          });
        }
      }

      // Nó: Verificar Disponibilidade
      if (nodeSelected.type === "checkAvailability") {
        console.log(`=== PROCESSANDO NÓ checkAvailability ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId }
          });
        }
        
        if (!ticket) {
          console.error("checkAvailability: Ticket não encontrado");
          continue;
        }

        try {
          const ScheduleAppointmentService = require("../ScheduleServices/ScheduleAppointmentService").default;
          
          const scheduleVariable = nodeSelected.data.scheduleVariable || "";
          const dateVariable = nodeSelected.data.dateVariable || "";
          const saveVariable = nodeSelected.data.saveVariable || "available_slots";
          const showMessage = nodeSelected.data.showMessage !== undefined ? nodeSelected.data.showMessage : true;
          const messageText = nodeSelected.data.messageText || "⏰ Horários disponíveis:\n{available_slots}";
          
          // Substituir variáveis
          const replaceVariables = (text: string) => {
            let result = text;
            if (ticket.dataWebhook) {
              Object.keys(ticket.dataWebhook).forEach(key => {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), ticket.dataWebhook[key]);
              });
            }
            return result;
          };
          
          const scheduleId = replaceVariables(scheduleVariable);
          const date = replaceVariables(dateVariable);
          
          if (!scheduleId || !date) {
            console.error("checkAvailability: scheduleId ou date não fornecidos");
            continue;
          }
          
          // Verificar disponibilidade
          const result = await ScheduleAppointmentService({
            action: "check_schedule_availability",
            companyId: ticket.companyId,
            scheduleId: parseInt(scheduleId),
            date: date
          });

          if (!result.success) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: "❌ Erro ao verificar disponibilidade."
            });
            continue;
          }

          const availableSlots = result.data.availableSlots || [];
          
          // Salvar variáveis no ticket
          if (!ticket.dataWebhook) ticket.dataWebhook = {};
          ticket.dataWebhook[saveVariable] = availableSlots.join(", ");
          ticket.dataWebhook[`${saveVariable}_array`] = availableSlots;
          ticket.dataWebhook.has_available_slots = availableSlots.length > 0;
          await ticket.save();
          
          // Enviar mensagem se configurado
          if (showMessage) {
            let message = messageText.replace("{available_slots}", availableSlots.join("\n"));
            message = replaceVariables(message);
            
            await SendMessage(whatsapp, {
              number: numberClient,
              body: message
            });
          }
          
        } catch (error) {
          console.error("checkAvailability: Erro ao processar:", error);
          await SendMessage(whatsapp, {
            number: numberClient,
            body: "❌ Erro ao verificar disponibilidade."
          });
        }
      }

      // Nó: Agendar Compromisso
      if (nodeSelected.type === "scheduleAppointment") {
        console.log(`=== PROCESSANDO NÓ scheduleAppointment ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId },
            include: [{ model: Contact, as: "contact" }]
          });
        }
        
        if (!ticket) {
          console.error("scheduleAppointment: Ticket não encontrado");
          continue;
        }

        try {
          const ScheduleAppointmentService = require("../ScheduleServices/ScheduleAppointmentService").default;
          
          const scheduleVariable = nodeSelected.data.scheduleVariable || "";
          const dateVariable = nodeSelected.data.dateVariable || "";
          const timeVariable = nodeSelected.data.timeVariable || "";
          const titleText = nodeSelected.data.titleText || "Agendamento";
          const descriptionText = nodeSelected.data.descriptionText || "";
          const durationMinutes = nodeSelected.data.durationMinutes || 60;
          const contactVariable = nodeSelected.data.contactVariable || (ticket.contact ? ticket.contact.id.toString() : "");
          const successMessage = nodeSelected.data.successMessage || "✅ Agendamento confirmado!";
          const unavailableMessage = nodeSelected.data.unavailableMessage || "❌ Horário indisponível.";
          const errorMessage = nodeSelected.data.errorMessage || "Erro ao agendar.";
          
          // Substituir variáveis
          const replaceVariables = (text: string) => {
            let result = text;
            if (ticket.dataWebhook) {
              Object.keys(ticket.dataWebhook).forEach(key => {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), ticket.dataWebhook[key]);
              });
            }
            if (ticket.contact) {
              result = result.replace(/\{contact_name\}/g, ticket.contact.name || "");
              result = result.replace(/\{contact_number\}/g, ticket.contact.number || "");
            }
            return result;
          };
          
          const scheduleId = replaceVariables(scheduleVariable);
          const date = replaceVariables(dateVariable);
          const time = replaceVariables(timeVariable);
          const title = replaceVariables(titleText);
          const description = replaceVariables(descriptionText);
          const contactId = replaceVariables(contactVariable);
          
          if (!scheduleId || !date || !time) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: errorMessage
            });
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          // Verificar disponibilidade primeiro
          const availabilityResult = await ScheduleAppointmentService({
            action: "check_schedule_availability",
            companyId: ticket.companyId,
            scheduleId: parseInt(scheduleId),
            date: date
          });

          if (!availabilityResult.success) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: errorMessage
            });
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }

          const isAvailable = availabilityResult.data.availableSlots.includes(time);

          if (!isAvailable) {
            const availableSlots = availabilityResult.data.availableSlots.join("\n");
            if (!ticket.dataWebhook) ticket.dataWebhook = {};
            ticket.dataWebhook.available_slots = availableSlots;
            await ticket.save();
            
            let message = unavailableMessage.replace("{available_slots}", availableSlots);
            message = replaceVariables(message);
            
            await SendMessage(whatsapp, {
              number: numberClient,
              body: message
            });
            
            const unavailableConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
            );
            if (unavailableConnection) execFn = unavailableConnection.target;
            continue;
          }
          
          // Criar agendamento
          const createResult = await ScheduleAppointmentService({
            action: "create_schedule_appointment",
            companyId: ticket.companyId,
            scheduleId: parseInt(scheduleId),
            date: date,
            startTime: time,
            durationMinutes: parseInt(durationMinutes.toString()),
            title: title,
            description: description,
            contactId: parseInt(contactId)
          });

          if (!createResult.success) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: errorMessage
            });
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          // Salvar variáveis no ticket
          if (!ticket.dataWebhook) ticket.dataWebhook = {};
          ticket.dataWebhook.appointment_id = createResult.data.appointment.id;
          ticket.dataWebhook.appointment_date = date;
          ticket.dataWebhook.appointment_time = time;
          ticket.dataWebhook.professional_name = createResult.data.schedule.user;
          await ticket.save();
          
          // Enviar mensagem de sucesso
          let message = replaceVariables(successMessage);
          await SendMessage(whatsapp, {
            number: numberClient,
            body: message
          });
          
          const successConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "success"
          );
          if (successConnection) execFn = successConnection.target;
          
        } catch (error) {
          console.error("scheduleAppointment: Erro ao processar:", error);
          await SendMessage(whatsapp, {
            number: numberClient,
            body: nodeSelected.data.errorMessage || "Erro ao agendar."
          });
          
          const errorConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
          );
          if (errorConnection) execFn = errorConnection.target;
        }
      }

      // Nó: Atualizar Agendamento
      if (nodeSelected.type === "updateAppointment") {
        console.log(`=== PROCESSANDO NÓ updateAppointment ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId }
          });
        }
        
        if (!ticket) {
          console.error("updateAppointment: Ticket não encontrado");
          continue;
        }

        try {
          const appointmentVariable = nodeSelected.data.appointmentVariable || "";
          const newDateVariable = nodeSelected.data.newDateVariable || "";
          const newTimeVariable = nodeSelected.data.newTimeVariable || "";
          const successMessage = nodeSelected.data.successMessage || "✅ Agendamento atualizado!";
          const errorMessage = nodeSelected.data.errorMessage || "Erro ao atualizar.";
          
          const replaceVariables = (text: string) => {
            let result = text;
            if (ticket.dataWebhook) {
              Object.keys(ticket.dataWebhook).forEach(key => {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), ticket.dataWebhook[key]);
              });
            }
            return result;
          };
          
          const appointmentId = replaceVariables(appointmentVariable);
          const newDate = newDateVariable ? replaceVariables(newDateVariable) : null;
          const newTime = newTimeVariable ? replaceVariables(newTimeVariable) : null;
          
          if (!appointmentId) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: errorMessage
            });
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          // TODO: Implementar lógica de atualização quando o service estiver pronto
          let message = replaceVariables(successMessage);
          await SendMessage(whatsapp, {
            number: numberClient,
            body: message
          });
          
          const successConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "success"
          );
          if (successConnection) execFn = successConnection.target;
          
        } catch (error) {
          console.error("updateAppointment: Erro ao processar:", error);
          await SendMessage(whatsapp, {
            number: numberClient,
            body: nodeSelected.data.errorMessage || "Erro ao atualizar."
          });
          
          const errorConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
          );
          if (errorConnection) execFn = errorConnection.target;
        }
      }

      // Nó: Cancelar Agendamento
      if (nodeSelected.type === "cancelAppointment") {
        console.log(`=== PROCESSANDO NÓ cancelAppointment ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId }
          });
        }
        
        if (!ticket) {
          console.error("cancelAppointment: Ticket não encontrado");
          continue;
        }

        try {
          const appointmentVariable = nodeSelected.data.appointmentVariable || "";
          const reasonVariable = nodeSelected.data.reasonVariable || "";
          const showMessage = nodeSelected.data.showMessage !== undefined ? nodeSelected.data.showMessage : true;
          const successMessage = nodeSelected.data.successMessage || "✅ Agendamento cancelado.";
          const errorMessage = nodeSelected.data.errorMessage || "❌ Erro ao cancelar.";
          
          const replaceVariables = (text: string) => {
            let result = text;
            if (ticket.dataWebhook) {
              Object.keys(ticket.dataWebhook).forEach(key => {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), ticket.dataWebhook[key]);
              });
            }
            return result;
          };
          
          const appointmentId = replaceVariables(appointmentVariable);
          const reason = reasonVariable ? replaceVariables(reasonVariable) : "Cancelado pelo cliente";
          
          if (!appointmentId) {
            if (showMessage) {
              await SendMessage(whatsapp, {
                number: numberClient,
                body: errorMessage
              });
            }
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          // TODO: Implementar lógica de cancelamento quando o service estiver pronto
          if (showMessage) {
            let message = replaceVariables(successMessage);
            await SendMessage(whatsapp, {
              number: numberClient,
              body: message
            });
          }
          
          const successConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "success"
          );
          if (successConnection) execFn = successConnection.target;
          
        } catch (error) {
          console.error("cancelAppointment: Erro ao processar:", error);
          
          if (nodeSelected.data.showMessage) {
            await SendMessage(whatsapp, {
              number: numberClient,
              body: nodeSelected.data.errorMessage || "❌ Erro ao cancelar."
            });
          }
          
          const errorConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "error"
          );
          if (errorConnection) execFn = errorConnection.target;
        }
      }

      // Nó: Buscar Último Agendamento
      if (nodeSelected.type === "fetchLastAppointment") {
        console.log(`=== PROCESSANDO NÓ fetchLastAppointment ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findByPk(idTicket, {
            include: [{ model: Contact, as: "contact" }]
          });
        }
        
        if (!ticket || !ticket.contact) {
          console.error("fetchLastAppointment: Ticket ou contato não encontrado");
          // Seguir para próximo nó
          const connection = connectStatic.find(
            conn => conn.source === nodeSelected.id
          );
          if (connection) execFn = connection.target;
          continue;
        }

        try {
          const identifierVariable = nodeSelected.data.identifierVariable || "";
          console.log("fetchLastAppointment: identifierVariable =", identifierVariable);
          console.log("fetchLastAppointment: ticket.dataWebhook =", ticket.dataWebhook);
          
          const replaceVariables = (text: string) => {
            let result = text;
            if (ticket.dataWebhook) {
              // Primeiro, busca nas chaves diretas de dataWebhook
              Object.keys(ticket.dataWebhook).forEach(key => {
                if (key !== 'variables' && typeof ticket.dataWebhook[key] !== 'object') {
                  result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), ticket.dataWebhook[key]);
                }
              });
              // Depois, busca dentro de dataWebhook.variables
              if (ticket.dataWebhook.variables) {
                Object.keys(ticket.dataWebhook.variables).forEach(key => {
                  result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), ticket.dataWebhook.variables[key]);
                });
              }
            }
            return result;
          };
          
          const identifier = replaceVariables(identifierVariable);
          console.log("fetchLastAppointment: identifier =", identifier);
          
          if (!identifier) {
            console.error("fetchLastAppointment: Identificador vazio");
            continue;
          }
          
          // Buscar último compromisso no banco
          const { QueryTypes } = require('sequelize');
          const sequelize = ticket.sequelize;
          
          const query = `
            SELECT 
              c.id,
              c.title,
              c.description,
              c.start_datetime,
              c.duration_minutes,
              c.status,
              a.name as agenda_nome,
              s.nome as servico_nome,
              cl.name as cliente_nome,
              cl.email as cliente_email,
              cl.document as cliente_documento
            FROM "appointments" c
            LEFT JOIN "user_schedules" a ON c.schedule_id = a.id
            LEFT JOIN "servicos" s ON c.service_id = s.id
            LEFT JOIN "crm_clients" cl ON c.client_id = cl.id
            WHERE (cl.email = :identifier OR cl.document = :identifier)
            ORDER BY c.start_datetime DESC
            LIMIT 1
          `;
          
          console.log("fetchLastAppointment: Executando query com identifier:", identifier);
          const appointments = await sequelize.query(query, {
            replacements: { identifier },
            type: QueryTypes.SELECT
          });
          
          console.log("fetchLastAppointment: Resultados da query:", appointments);
          
          if (appointments && appointments.length > 0) {
            const appointment = appointments[0];
            
            // Salvar variáveis no ticket.dataWebhook.variables
            if (!ticket.dataWebhook) {
              ticket.dataWebhook = {};
            }
            if (!ticket.dataWebhook.variables) {
              ticket.dataWebhook.variables = {};
            }
            
            // Formatar data e hora
            const startDate = new Date(appointment.start_datetime);
            const endDate = new Date(startDate.getTime() + (appointment.duration_minutes || 0) * 60000);
            
            // Formato: 20/05/26 às 16:10
            const formatDateTime = (date: Date) => {
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = String(date.getFullYear()).slice(-2);
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              return `${day}/${month}/${year} às ${hours}:${minutes}`;
            };
            
            const formatTime = (date: Date) => {
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              return `${hours}:${minutes}`;
            };
            
            // Criar todas as variáveis automaticamente dentro de variables
            ticket.dataWebhook.variables.ultimo_titulo = appointment.title || '';
            ticket.dataWebhook.variables.ultimo_descricao = appointment.description || '';
            ticket.dataWebhook.variables.ultimo_data_inicio = formatDateTime(startDate);
            ticket.dataWebhook.variables.ultimo_data_fim = formatTime(endDate);
            ticket.dataWebhook.variables.ultimo_duracao = appointment.duration_minutes || '';
            ticket.dataWebhook.variables.ultimo_status = appointment.status || '';
            ticket.dataWebhook.variables.ultimo_agenda = appointment.agenda_nome || '';
            ticket.dataWebhook.variables.ultimo_servico = appointment.servico_nome || '';
            ticket.dataWebhook.variables.ultimo_cliente_nome = appointment.cliente_nome || '';
            ticket.dataWebhook.variables.ultimo_cliente_email = appointment.cliente_email || '';
            ticket.dataWebhook.variables.ultimo_cliente_doc = appointment.cliente_documento || '';
            
            // Marcar o campo como alterado para o Sequelize detectar a mudança
            ticket.changed('dataWebhook', true);
            await ticket.save();
            await ticket.reload();
            console.log("fetchLastAppointment: Variáveis criadas automaticamente:", ticket.dataWebhook);
          } else {
            console.log("fetchLastAppointment: Nenhum agendamento encontrado");
          }
          
          // Seguir para próximo nó
          const connection = connectStatic.find(
            conn => conn.source === nodeSelected.id
          );
          if (connection) execFn = connection.target;
          
        } catch (error) {
          console.error("fetchLastAppointment: Erro ao processar:", error);
          const connection = connectStatic.find(
            conn => conn.source === nodeSelected.id
          );
          if (connection) execFn = connection.target;
        }
      }

      // Nó: Agendamento Inteligente
      if (nodeSelected.type === "smartAppointment") {
        console.log(`=== PROCESSANDO NÓ smartAppointment ===`);
        
        if (!ticket && idTicket) {
          ticket = await Ticket.findByPk(idTicket, {
            include: [{ model: Contact, as: "contact" }]
          });
        }
        
        if (!ticket || !ticket.contact) {
          console.error("smartAppointment: Ticket ou contato não encontrado");
          
          const unavailableConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
          );
          if (unavailableConnection) execFn = unavailableConnection.target;
          continue;
        }

        try {
          const appointmentTitle = nodeSelected.data.appointmentTitle || "";
          const description = nodeSelected.data.description || "";
          const scheduleId = nodeSelected.data.scheduleId;
          const serviceId = nodeSelected.data.serviceId;
          const identifierVariable = nodeSelected.data.identifierVariable || "";
          const dateVariable = nodeSelected.data.dateVariable || "";
          const timeVariable = nodeSelected.data.timeVariable || "";
          const status = nodeSelected.data.status || "scheduled";
          
          const replaceVariables = (text: string) => {
            let result = text;
            if (ticket.dataWebhook) {
              // Substituir variáveis diretas do dataWebhook
              Object.keys(ticket.dataWebhook).forEach(key => {
                if (key !== 'variables' && typeof ticket.dataWebhook[key] !== 'object') {
                  result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), ticket.dataWebhook[key]);
                }
              });
              // Substituir variáveis dentro de dataWebhook.variables
              if (ticket.dataWebhook.variables) {
                Object.keys(ticket.dataWebhook.variables).forEach(key => {
                  const cleanKey = key.replace(/\{\{|\}\}/g, ''); // Remove {{ }} se existir
                  result = result.replace(new RegExp(`\\{\\{${cleanKey}\\}\\}`, 'g'), ticket.dataWebhook.variables[key]);
                });
              }
            }
            return result;
          };
          
          const titulo = replaceVariables(appointmentTitle);
          const descricao = replaceVariables(description);
          const identifier = replaceVariables(identifierVariable);
          const dataStr = replaceVariables(dateVariable);
          const horaStr = replaceVariables(timeVariable);
          
          if (!scheduleId || !serviceId || !identifier || !dataStr || !horaStr) {
            console.error("smartAppointment: Campos obrigatórios faltando");
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          // Buscar serviço para obter duração
          const { QueryTypes } = require('sequelize');
          const sequelize = ticket.sequelize;
          
          const serviceQuery = `SELECT "tempoAtendimento" as duration FROM "servicos" WHERE id = :serviceId LIMIT 1`;
          const services = await sequelize.query(serviceQuery, {
            replacements: { serviceId },
            type: QueryTypes.SELECT
          });
          
          if (!services || services.length === 0) {
            console.error("smartAppointment: Serviço não encontrado");
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          const duracao = services[0].duration || 60;
          
          // Converter data e hora para timestamp
          const dataParts = dataStr.split('/');
          let dia, mes, ano;
          
          if (dataParts.length === 2) {
            // Formato DD/MM - adiciona ano atual
            dia = dataParts[0];
            mes = dataParts[1];
            ano = new Date().getFullYear().toString();
          } else if (dataParts.length === 3) {
            // Formato DD/MM/AAAA
            dia = dataParts[0];
            mes = dataParts[1];
            ano = dataParts[2];
          } else {
            console.error("smartAppointment: Formato de data inválido:", dataStr);
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          const [hora, minuto] = horaStr.split(':');
          const dataInicio = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto));
          const dataFim = new Date(dataInicio.getTime() + duracao * 60000);
          
          // Validar se a data não é no passado
          const agora = new Date();
          if (dataInicio < agora) {
            console.error("smartAppointment: Data no passado");
            
            const errorConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
            );
            if (errorConnection) execFn = errorConnection.target;
            continue;
          }
          
          // Buscar horários de trabalho do usuário da agenda
          const userQuery = `
            SELECT u."startWork", u."endWork", u."workDays", u."lunchStart", u."lunchEnd"
            FROM "Users" u
            INNER JOIN user_schedules us ON us.user_id = u.id
            WHERE us.id = :scheduleId
            LIMIT 1
          `;
          const userSchedule = await sequelize.query(userQuery, {
            replacements: { scheduleId },
            type: QueryTypes.SELECT
          });
          
          if (userSchedule && userSchedule.length > 0) {
            const { startWork, endWork, workDays, lunchStart, lunchEnd } = userSchedule[0];
            
            // Validar dia da semana (0=domingo, 1=segunda, ..., 6=sábado)
            const diaSemana = dataInicio.getDay();
            const diasTrabalho = workDays ? workDays.split(',').map(d => parseInt(d)) : [1,2,3,4,5];
            
            if (!diasTrabalho.includes(diaSemana)) {
              console.error("smartAppointment: Funcionário não trabalha neste dia");
              
              const errorConnection = connectStatic.find(
                conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
              );
              if (errorConnection) execFn = errorConnection.target;
              continue;
            }
            
            // Validar horário de trabalho
            const startTime = dataInicio.toTimeString().substring(0, 5);
            const endTime = dataFim.toTimeString().substring(0, 5);
            
            if (startWork && endWork) {
              if (startTime < startWork || endTime > endWork) {
                console.error("smartAppointment: Horário fora do expediente");
                
                const errorConnection = connectStatic.find(
                  conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
                );
                if (errorConnection) execFn = errorConnection.target;
                continue;
              }
            }
            
            // Validar horário de almoço
            if (lunchStart && lunchEnd) {
              const lunchStartMinutes = parseInt(lunchStart.split(":")[0], 10) * 60 + parseInt(lunchStart.split(":")[1], 10);
              const lunchEndMinutes = parseInt(lunchEnd.split(":")[0], 10) * 60 + parseInt(lunchEnd.split(":")[1], 10);
              
              const appointmentStartMinutes = dataInicio.getHours() * 60 + dataInicio.getMinutes();
              const appointmentEndMinutes = dataFim.getHours() * 60 + dataFim.getMinutes();
              
              const overlapsLunch = (
                (appointmentStartMinutes >= lunchStartMinutes && appointmentStartMinutes < lunchEndMinutes) ||
                (appointmentEndMinutes > lunchStartMinutes && appointmentEndMinutes <= lunchEndMinutes) ||
                (appointmentStartMinutes <= lunchStartMinutes && appointmentEndMinutes >= lunchEndMinutes)
              );
              
              if (overlapsLunch) {
                console.error("smartAppointment: Horário de almoço");
                
                const errorConnection = connectStatic.find(
                  conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
                );
                if (errorConnection) execFn = errorConnection.target;
                continue;
              }
            }
          }
          
          // Verificar conflitos com agendamentos existentes (mesma lógica do CreateAppointmentService)
          const existingAppointmentsQuery = `
            SELECT id, title, start_datetime, duration_minutes
            FROM "appointments" 
            WHERE schedule_id = :scheduleId 
            AND status NOT IN ('cancelled', 'no_show')
          `;
          
          const existingAppointments = await sequelize.query(existingAppointmentsQuery, {
            replacements: { scheduleId },
            type: QueryTypes.SELECT
          });
          
          const newStart = dataInicio.getTime();
          const newEnd = dataFim.getTime();
          
          let hasConflict = false;
          for (const existing of existingAppointments) {
            const existingStart = new Date(existing.start_datetime).getTime();
            const existingEnd = existingStart + existing.duration_minutes * 60000;
            
            // Verificar sobreposição de horários
            if (
              (newStart >= existingStart && newStart < existingEnd) ||
              (newEnd > existingStart && newEnd <= existingEnd) ||
              (newStart <= existingStart && newEnd >= existingEnd)
            ) {
              console.log("smartAppointment: Conflito com agendamento existente:", existing.title);
              hasConflict = true;
              break;
            }
          }
          
          if (hasConflict) {
            console.error("smartAppointment: Conflito de horário");
            
            const unavailableConnection = connectStatic.find(
              conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
            );
            if (unavailableConnection) execFn = unavailableConnection.target;
            continue;
          }
          
          // Buscar cliente CRM pelo identificador
          let clientId = null;
          const clientQuery = `
            SELECT id FROM "crm_clients" 
            WHERE email = :identifier OR document = :identifier 
            LIMIT 1
          `;
          const clients = await sequelize.query(clientQuery, {
            replacements: { identifier },
            type: QueryTypes.SELECT
          });
          
          if (clients && clients.length > 0) {
            clientId = clients[0].id;
          }
          
          // Criar agendamento
          const insertQuery = `
            INSERT INTO "appointments" 
            (title, description, schedule_id, service_id, client_id, contact_id, start_datetime, duration_minutes, status, company_id, created_at, updated_at)
            VALUES 
            (:title, :description, :scheduleId, :serviceId, :clientId, :contactId, :startDatetime, :durationMinutes, :status, :companyId, NOW(), NOW())
            RETURNING id
          `;
          
          console.log("smartAppointment: Criando agendamento com status:", status);
          
          const result = await sequelize.query(insertQuery, {
            replacements: {
              title: titulo,
              description: descricao,
              scheduleId,
              serviceId,
              clientId,
              contactId: ticket.contact.id,
              startDatetime: dataInicio.toISOString(),
              durationMinutes: duracao,
              status,
              companyId: ticket.companyId
            },
            type: QueryTypes.INSERT
          });
          
          const appointmentId = result[0][0].id;
          console.log("smartAppointment: Agendamento criado com ID:", appointmentId);
          
          // Salvar ID do agendamento em variáveis
          if (!ticket.dataWebhook) {
            ticket.dataWebhook = {};
          }
          ticket.dataWebhook.appointment_id = appointmentId;
          ticket.dataWebhook.appointment_status = status;
          await ticket.save();
          
          console.log("smartAppointment: Agendamento criado com sucesso:", appointmentId);
          
          await SendMessage(whatsapp, {
            number: numberClient,
            body: `✅ Agendamento confirmado!\n\n📅 ${titulo}\n🕐 ${dataStr} às ${horaStr}\n⏱️ Duração: ${duracao} minutos`
          });
          
          const successConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "success"
          );
          if (successConnection) execFn = successConnection.target;
          
        } catch (error) {
          console.error("smartAppointment: Erro ao processar:", error);
          
          await SendMessage(whatsapp, {
            number: numberClient,
            body: "❌ Erro ao criar agendamento. Tente novamente."
          });
          
          const errorConnection = connectStatic.find(
            conn => conn.source === nodeSelected.id && conn.sourceHandle === "unavailable"
          );
          if (errorConnection) execFn = errorConnection.target;
        }
      }

      let isMenu: boolean;

      if (nodeSelected.type === "menu") {
        // Garantir que o ticket existe antes de processar menu (segundo bloco)
        if (!ticket && idTicket) {
          console.log("Menu (segundo bloco): Carregando ticket...");
          ticket = await Ticket.findOne({
            where: { id: idTicket, companyId }
          });
          console.log("Menu (segundo bloco): Ticket carregado:", ticket?.id);
        }
        
        console.log(650, "menu");
        if (pressKey) {
          const filterOne = connectStatic.filter(
            confil => confil.source === next
          );
          const filterTwo = filterOne.filter(
            filt2 => filt2.sourceHandle === "a" + pressKey
          );
          if (filterTwo.length > 0) {
            execFn = filterTwo[0].target;
          } else {
            execFn = undefined;
          }
          // execFn =
          //   connectStatic
          //     .filter(confil => confil.source === next)
          //     .filter(filt2 => filt2.sourceHandle === "a" + pressKey)[0]?.target ??
          //   undefined;
          if (execFn === undefined) {
            break;
          }
          pressKey = "999";

          const isNodeExist = nodes.filter(item => item.id === execFn);
          console.log(674, "menu");
          if (isNodeExist.length > 0) {
            isMenu = isNodeExist[0].type === "menu" ? true : false;
          } else {
            isMenu = false;
          }
        } else {
          console.log(681, "menu - não há pressKey, menu já enviado pelo primeiro bloco");
          // O menu já foi enviado pelo primeiro bloco (linha 470), não duplicar aqui
          // Definir isMenu para manter consistência
          isMenu = true;
        }

        if (ticket) {
          ticket = await Ticket.findOne({
            where: {
              id: ticket.id,
              whatsappId: whatsappId,
              companyId: companyId
            }
          });
        } else {
          ticket = await Ticket.findOne({
            where: {
              id: idTicket,
              whatsappId: whatsappId,
              companyId: companyId
            }
          });
        }

        if (ticket) {
          await ticket.update({
            queueId: ticket.queueId ? ticket.queueId : null,
            userId: null,
            companyId: companyId,
            flowWebhook: true,
            lastFlowId: nodeSelected.type === "directOpenai" ? ticket.lastFlowId : nodeSelected.id, // Sempre usar o ID do nó atual para menu
            dataWebhook: dataWebhook,
            hashFlowId: hashWebhookId,
            flowStopped: idFlowDb.toString()
          });
          console.log(`Menu: Ticket atualizado com lastFlowId=${nodeSelected.id} para aguardar resposta`);
        }

        break;
      }

      if (pressKey === "999" && execCount > 0) {
        console.log(587, "ActionsWebhookService | 587");

        pressKey = undefined;
        let result = connects.filter(connect => connect.source === execFn)[0];
        if (typeof result === "undefined") {
          next = "";
        } else {
          if (!noAlterNext) {
            next = result.target;
          }
        }
      } else {
        let result;

        if (isMenu) {
          result = { target: execFn };
          isContinue = true;
          pressKey = undefined;
        } else if (isRandomizer) {
          isRandomizer = false;
          result = next;
        } else if (isCondition) {
          isCondition = false;
          result = next;
        } else {
          result = connects.filter(connect => connect.source === next)[0];
        }

        if (typeof result === "undefined") {
          next = "";
        } else {
          if (!noAlterNext) {
            next = result.target;
          }
        }
        console.log(619, "ActionsWebhookService");
      }

      if (!pressKey && !isContinue && next !== "") {
        console.log(`=== ENTRANDO NO BLOCO PROBLEMÁTICO - pressKey=${pressKey}, isContinue=${isContinue}, isKeywordCondition=${isKeywordCondition} ===`);
        console.log(`=== next antes do bloco: ${next} ===`);
        const nextNodeConnection = connects.find(
          connect => connect.source === nodeSelected.id
        );
        console.log(`=== nextNodeConnection encontrado: ${nextNodeConnection?.target || 'null'} ===`);

        console.log(626, "ActionsWebhookService");

        // Se não há próximo nó, finalizar fluxo
        if (!nextNodeConnection) {
          console.log(654, "ActionsWebhookService - Sem próximo nó, finalizando fluxo");

          await Ticket.findOne({
            where: { id: idTicket, whatsappId, companyId: companyId }
          });
          await ticket.update({
            lastFlowId: nodeSelected.type === "directOpenai" ? ticket.lastFlowId : nodeSelected.id,
            hashFlowId: null,
            flowWebhook: false,
            flowStopped: idFlowDb.toString()
          });
          break;
        }
      }

      isContinue = false;

      if (next === "") {
        break;
      }

      console.log(678, "ActionsWebhookService");

      console.log("UPDATE10...");
      ticket = await Ticket.findOne({
        where: { id: idTicket, whatsappId, companyId: companyId }
      });

      if (ticket.status === "closed") {
        io.of(String(companyId))
          // .to(oldStatus)
          // .to(ticketId.toString())
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticketId: ticket.id
          });
      }

      console.log("UPDATE12...");

      const hasNextNodes =
        connects.filter(connect => connect.source === nodeSelected.id).length >
        0;

      console.log("Conexões para nó atual:", hasNextNodes ? "SIM" : "NÃO");
      console.log("Próximo nó:", next);

      // Sempre atualizar flowStopped para garantir que o fluxo correto seja usado
      // Mas não atualizar lastFlowId para nó directOpenai (deve continuar no mesmo nó)
      const updateData: any = {
        whatsappId: whatsappId,
        queueId: ticket?.queueId,
        userId: null,
        companyId: companyId,
        flowWebhook: true,
        hashFlowId: hashWebhookId,
        flowStopped: idFlowDb.toString()
      };
      
      // Só atualizar lastFlowId se não for nó directOpenai (deve continuar no mesmo nó)
      if (nodeSelected.type !== "directOpenai") {
        updateData.lastFlowId = nodeSelected.id;
      }
      
      await ticket.update(updateData);
      
      if (!hasNextNodes) {
        console.log(
          "Finalizando fluxo no nó",
          nodeSelected.type,
          "sem próximos nós"
        );
      }

      noAlterNext = false;
      execCount++;
    }

    return "ds";
  } catch (error) {
    logger.error(error);
  }
};

const constructJsonLine = (line: string, json: any) => {
  let valor = json;
  const chaves = line.split(".");

  if (chaves.length === 1) {
    return valor[chaves[0]];
  }

  for (const chave of chaves) {
    valor = valor[chave];
  }
  return valor;
};

function removerNaoLetrasNumeros(texto: string) {
  // Substitui todos os caracteres que não são letras ou números por vazio
  return texto.replace(/[^a-zA-Z0-9]/g, "");
}

const sendMessageWhats = async (
  whatsId: number,
  msg: any,
  req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
) => {
  sendMessageFlow(whatsId, msg, req);
  return Promise.resolve();
};

const intervalWhats = (time: string) => {
  const seconds = parseInt(time) * 1000;
  return new Promise(resolve => setTimeout(resolve, seconds));
};

const replaceMessages = (variables, message) => {
  return message.replace(
    /{{\s*([^{}\s]+)\s*}}/g,
    (match, key) => variables[key] || ""
  );
};

const replaceMessagesOld = (
  message: string,
  details: any,
  dataWebhook: any,
  dataNoWebhook?: any
) => {
  const matches = message.match(/\{([^}]+)\}/g);

  if (dataWebhook) {
    let newTxt = message.replace(/{+nome}+/, dataNoWebhook.nome);
    newTxt = newTxt.replace(/{+numero}+/, dataNoWebhook.numero);
    newTxt = newTxt.replace(/{+email}+/, dataNoWebhook.email);
    return newTxt;
  }

  if (matches && matches.includes("inputs")) {
    const placeholders = matches.map(match => match.replace(/\{|\}/g, ""));
    let newText = message;
    placeholders.map(item => {
      const value = details["inputs"].find(
        itemLocal => itemLocal.keyValue === item
      );
      const lineToData = details["keysFull"].find(itemLocal =>
        itemLocal.endsWith(`.${value.data}`)
      );
      const createFieldJson = constructJsonLine(lineToData, dataWebhook);
      newText = newText.replace(`{${item}}`, createFieldJson);
    });
    return newText;
  } else {
    return message;
  }
};
