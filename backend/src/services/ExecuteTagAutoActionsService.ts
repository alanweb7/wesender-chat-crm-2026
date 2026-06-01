import Tag from "../models/Tag";
import Ticket from "../models/Ticket";
import TicketTag from "../models/TicketTag";
import ContactTag from "../models/ContactTag";
import Contact from "../models/Contact";
import User from "../models/User";
import Queue from "../models/Queue";
import Schedule from "../models/Schedule";
import CrmLead from "../models/CrmLead";
import { FlowBuilderModel } from "../models/FlowBuilder";
import { randomString } from "../utils/randomCode";
import { getIO } from "../libs/socket";
import logger from "../utils/logger";
import { ActionsWebhookService } from "./WebhookService/ActionsWebhookService";

interface AutoAction {
  id: number;
  type: string;
  tagId?: string;
  queueId?: string;
  userId?: string;
  closeTicket?: boolean;
  leadStatus?: string;
  flowId?: string;
  // Agendamento
  scheduleDelay?: string;
  scheduleDelayUnit?: string;
  scheduleMessageText?: string;
  scheduleStartFlow?: boolean; // Iniciar fluxo após mensagem
  scheduleFlowId?: string; // ID do fluxo para iniciar após mensagem
}

export const ExecuteTagAutoActions = async (
  tagId: number,
  ticketId: number,
  companyId: number
): Promise<void> => {
  try {
    logger.info(`[ExecuteTagAutoActions] Iniciando execução - tagId=${tagId}, ticketId=${ticketId}, companyId=${companyId}`);

    const tag = await Tag.findOne({
      where: { id: tagId, companyId }
    });

    if (!tag) {
      logger.warn(`[ExecuteTagAutoActions] Tag ${tagId} não encontrada`);
      return;
    }

    if (!tag.autoActions || !Array.isArray(tag.autoActions) || tag.autoActions.length === 0) {
      logger.info(`[ExecuteTagAutoActions] Tag ${tagId} não tem ações automáticas configuradas`);
      return;
    }

    logger.info(`[ExecuteTagAutoActions] Tag ${tagId} tem ${tag.autoActions.length} ações configuradas`);

    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Tag, as: "tags" },
        { model: Contact, as: "contact" },
        { model: User, as: "user" },
        { model: Queue, as: "queue" }
      ]
    });

    if (!ticket) {
      logger.warn(`[ExecuteTagAutoActions] Ticket ${ticketId} não encontrado`);
      return;
    }

    const contact = ticket.contact;

    if (!contact) {
      logger.warn(`[ExecuteTagAutoActions] Ticket ${ticketId} não tem contato associado`);
      return;
    }

    logger.info(`[ExecuteTagAutoActions] Ticket encontrado com contactId=${contact.id}`);

    logger.info(`[ExecuteTagAutoActions] Executando ${tag.autoActions.length} ações para tag ${tagId}, ticket ${ticketId}`);

    for (const action of tag.autoActions as AutoAction[]) {
      logger.info(`[ExecuteTagAutoActions] Executando ação type=${action.type}, id=${action.id}`);
      await executeAction(action, ticket, contact, companyId);
    }

    logger.info(`[ExecuteTagAutoActions] Execução concluída com sucesso`);

    // Emitir atualização do ticket
    const io = getIO();
    const ticketJSON = ticket.toJSON() as any;
    if (!ticketJSON.tags) ticketJSON.tags = [];
    ticketJSON.tags = ticketJSON.tags.filter((t: any) => t && t.name);

    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket: ticketJSON
    });

    logger.info(`[ExecuteTagAutoActions] Ações executadas com sucesso para ticket ${ticketId}`);
  } catch (error) {
    logger.error(`[ExecuteTagAutoActions] Erro ao executar ações:`, error);
  }
};

const executeAction = async (
  action: AutoAction,
  ticket: Ticket,
  contact: Contact,
  companyId: number
): Promise<void> => {
  switch (action.type) {
    case "addTag":
      await executeAddTag(action, ticket, contact, companyId);
      break;
    case "transferQueue":
      await executeTransferQueue(action, ticket, companyId);
      break;
    case "transferUser":
      await executeTransferUser(action, ticket, companyId);
      break;
    case "transferQueueUser":
      await executeTransferQueueUser(action, ticket, companyId);
      break;
    case "closeTicket":
      await executeCloseTicket(ticket, companyId);
      break;
    case "setLeadStatus":
      await executeSetLeadStatus(action, contact, companyId);
      break;
    case "startFlow":
      await executeStartFlow(action, contact, ticket, companyId);
      break;
    case "scheduleMessage":
      await executeScheduleMessage(action, ticket, contact, companyId);
      break;
    default:
      logger.warn(`[ExecuteTagAutoActions] Tipo de ação desconhecido: ${action.type}`);
  }
};

const executeAddTag = async (
  action: AutoAction,
  ticket: Ticket,
  contact: Contact,
  companyId: number
): Promise<void> => {
  if (!action.tagId) {
    logger.warn(`[ExecuteTagAutoActions] addTag: tagId não fornecido`);
    return;
  }

  const tagId = parseInt(action.tagId);
  const tag = await Tag.findOne({
    where: { id: tagId, companyId }
  });

  if (!tag) {
    logger.warn(`[ExecuteTagAutoActions] addTag: Tag ${tagId} não encontrada`);
    return;
  }

  logger.info(`[ExecuteTagAutoActions] Tag "${tag.name}" encontrada`);

  // Adicionar tag ao ticket
  try {
    logger.info(`[ExecuteTagAutoActions] addTag: Adicionando tag ao ticket ${ticket.id}`);
    const [ticketTag, created] = await TicketTag.findOrCreate({
      where: { ticketId: ticket.id, tagId: tag.id }
    });
    logger.info(`[ExecuteTagAutoActions] addTag: TicketTag ${created ? 'criado' : 'já existia'}`);
  } catch (error: any) {
    logger.error(`[ExecuteTagAutoActions] addTag: Erro ao adicionar tag ao ticket:`, error.message);
  }

  // Adicionar tag ao contato
  try {
    logger.info(`[ExecuteTagAutoActions] addTag: Adicionando tag ao contato ${contact.id}`);
    const [contactTag, created] = await ContactTag.findOrCreate({
      where: { contactId: contact.id, tagId: tag.id, companyId }
    });
    logger.info(`[ExecuteTagAutoActions] addTag: ContactTag ${created ? 'criado' : 'já existia'}`);
  } catch (error: any) {
    logger.error(`[ExecuteTagAutoActions] addTag: Erro ao adicionar tag ao contato:`, error.message);
  }

  logger.info(`[ExecuteTagAutoActions] Tag "${tag.name}" adicionada ao ticket ${ticket.id}`);
};

const executeTransferQueue = async (
  action: AutoAction,
  ticket: Ticket,
  companyId: number
): Promise<void> => {
  if (!action.queueId) {
    logger.warn(`[ExecuteTagAutoActions] transferQueue: queueId não fornecido`);
    return;
  }

  const queueId = parseInt(action.queueId);
  ticket.queueId = queueId;
  await ticket.save();

  logger.info(`[ExecuteTagAutoActions] Ticket ${ticket.id} transferido para fila ${queueId}`);
};

const executeTransferUser = async (
  action: AutoAction,
  ticket: Ticket,
  companyId: number
): Promise<void> => {
  if (!action.userId) {
    logger.warn(`[ExecuteTagAutoActions] transferUser: userId não fornecido`);
    return;
  }

  const userId = parseInt(action.userId);
  ticket.userId = userId;
  await ticket.save();

  logger.info(`[ExecuteTagAutoActions] Ticket ${ticket.id} atribuído ao usuário ${userId}`);
};

const executeTransferQueueUser = async (
  action: AutoAction,
  ticket: Ticket,
  companyId: number
): Promise<void> => {
  if (!action.queueId || !action.userId) {
    logger.warn(`[ExecuteTagAutoActions] transferQueueUser: queueId ou userId não fornecido`);
    return;
  }

  const queueId = parseInt(action.queueId);
  const userId = parseInt(action.userId);
  
  ticket.queueId = queueId;
  ticket.userId = userId;
  await ticket.save();

  logger.info(`[ExecuteTagAutoActions] Ticket ${ticket.id} transferido para fila ${queueId} e usuário ${userId}`);
};

const executeCloseTicket = async (
  ticket: Ticket,
  companyId: number
): Promise<void> => {
  logger.info(`[ExecuteTagAutoActions] closeTicket: Status ANTES: ${ticket.status}`);
  
  await Ticket.update(
    { status: "closed", queueId: null, userId: null },
    { where: { id: ticket.id } }
  );

  logger.info(`[ExecuteTagAutoActions] closeTicket: Ticket ${ticket.id} atualizado para closed`);
  
  // Verificar se foi salvo corretamente
  const ticketVerificado = await Ticket.findByPk(ticket.id);
  logger.info(`[ExecuteTagAutoActions] closeTicket: Status NO BANCO: ${ticketVerificado?.status}`);

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
    action: "delete",
    ticketId: ticket.id
  });

  logger.info(`[ExecuteTagAutoActions] Ticket ${ticket.id} encerrado`);
};

const executeSetLeadStatus = async (
  action: AutoAction,
  contact: Contact,
  companyId: number
): Promise<void> => {
  if (!action.leadStatus) {
    logger.warn(`[ExecuteTagAutoActions] setLeadStatus: leadStatus não fornecido`);
    return;
  }

  logger.info(`[ExecuteTagAutoActions] setLeadStatus: Buscando lead para contactId=${contact.id}, companyId=${companyId}`);

  // Buscar lead associado ao contato
  const lead = await CrmLead.findOne({
    where: { contactId: contact.id, companyId }
  });

  logger.info(`[ExecuteTagAutoActions] setLeadStatus: Lead encontrado? ${!!lead}, ID: ${lead?.id}`);
  if (lead) {
    logger.info(`[ExecuteTagAutoActions] setLeadStatus: Status ATUAL do lead: "${lead.leadStatus}"`);
    logger.info(`[ExecuteTagAutoActions] setLeadStatus: Status NOVO do lead: "${action.leadStatus}"`);
    
    lead.leadStatus = action.leadStatus;
    await lead.save();
    
    logger.info(`[ExecuteTagAutoActions] Lead ${lead.id} status alterado para ${action.leadStatus}`);
    
    // Verificar se foi salvo corretamente
    const leadVerificado = await CrmLead.findByPk(lead.id);
    logger.info(`[ExecuteTagAutoActions] setLeadStatus: Status APÓS salvar: "${leadVerificado?.leadStatus}"`);
    
    // Emitir evento para atualizar frontend
    const io = getIO();
    io.emit(`company-${companyId}-crm-lead`, {
      action: "update",
      lead: leadVerificado
    });
    logger.info(`[ExecuteTagAutoActions] Evento socket emitido para atualizar lead ${lead.id}`);
  } else {
    logger.warn(`[ExecuteTagAutoActions] Lead não encontrado para contato ${contact.id}`);
  }
};

const executeScheduleMessage = async (
  action: AutoAction,
  ticket: Ticket,
  contact: Contact,
  companyId: number
): Promise<void> => {
  if (!action.scheduleDelay) {
    logger.warn(`[ExecuteTagAutoActions] scheduleMessage: dados incompletos`);
    return;
  }

  const delay = parseInt(action.scheduleDelay);
  const unit = action.scheduleDelayUnit || "hours";
  
  // Calcular data de envio
  const sendAt = new Date();
  if (unit === "minutes") {
    sendAt.setMinutes(sendAt.getMinutes() + delay);
  } else if (unit === "hours") {
    sendAt.setHours(sendAt.getHours() + delay);
  } else {
    sendAt.setDate(sendAt.getDate() + delay);
  }

  // Preparar dados extras (flowId para iniciar após mensagem)
  // Armazenando flowId no campo tagIds temporariamente (JSON pode armazenar qualquer dado)
  const tagIds = action.scheduleStartFlow && action.scheduleFlowId 
    ? { flowId: action.scheduleFlowId, startFlow: true }
    : [];

  // Criar agendamento
  await Schedule.create({
    body: action.scheduleMessageText || "",
    sendAt: sendAt,
    contactId: contact.id,
    ticketId: ticket.id,
    companyId: companyId,
    status: "PENDENTE",
    whatsappId: ticket.whatsappId,
    tagIds: tagIds as any
  });

  logger.info(`[ExecuteTagAutoActions] Mensagem agendada para ${sendAt.toISOString()}`);
  if (action.scheduleStartFlow) {
    logger.info(`[ExecuteTagAutoActions] Fluxo ${action.scheduleFlowId} será iniciado após envio da mensagem`);
  }
};

export const executeStartFlow = async (
  action: AutoAction,
  contact: Contact,
  ticket: Ticket,
  companyId: number
): Promise<void> => {
  if (!action.flowId) {
    logger.warn(`[ExecuteTagAutoActions] startFlow: flowId não fornecido`);
    return;
  }

  logger.info(`[ExecuteTagAutoActions] startFlow: Iniciando fluxo ${action.flowId} para ticket ${ticket.id}`);

  try {
    const flow = await FlowBuilderModel.findOne({
      where: { id: action.flowId, company_id: companyId }
    });

    if (!flow || !flow.flow) {
      logger.warn(`[ExecuteTagAutoActions] startFlow: Fluxo não encontrado ou sem dados`);
      return;
    }

    const flowData = typeof flow.flow === 'string' 
      ? JSON.parse(flow.flow) 
      : flow.flow;

    const nodes = flowData.nodes || [];
    const connections = flowData.connections || [];

    // Encontrar o nó de início do fluxo
    const startNode = nodes.find((n: any) => n.type === "start");

    if (!startNode) {
      logger.warn(`[ExecuteTagAutoActions] startFlow: Nó start não encontrado`);
      return;
    }

    // Encontrar a conexão que sai do start
    const startConnection = connections.find((c: any) => c.source === startNode.id);

    if (!startConnection) {
      logger.warn(`[ExecuteTagAutoActions] startFlow: Conexão start não encontrada`);
      return;
    }

    // Gerar novo hash para o fluxo
    const newHashFlowId = randomString(42);

    // Atualizar ticket com o fluxo
    await ticket.update({
      flowWebhook: true,
      lastFlowId: startConnection.target,
      hashFlowId: newHashFlowId,
      flowStopped: action.flowId.toString()
    });

    logger.info(`[ExecuteTagAutoActions] startFlow: Ticket atualizado, executando primeiro nó...`);

    // Executar o primeiro nó imediatamente (não esperar próxima mensagem do usuário)
    const mountDataContact = {
      number: contact.number,
      name: contact.name,
      email: contact.email || ""
    };

    await ActionsWebhookService(
      ticket.whatsappId,
      parseInt(action.flowId),
      companyId,
      nodes,
      connections,
      startConnection.target,
      null,
      "",
      newHashFlowId,
      null,
      ticket.id,
      mountDataContact
    );

    logger.info(`[ExecuteTagAutoActions] startFlow: Fluxo iniciado e primeiro nó executado para ticket ${ticket.id}`);
  } catch (error) {
    logger.error(`[ExecuteTagAutoActions] startFlow: Erro ao iniciar fluxo:`, error);
  }
};
