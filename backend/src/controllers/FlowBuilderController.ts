import { Request, Response } from "express";
import CreateWebHookService from "../services/WebhookService/CreateWebHookService";
import DeleteWebHookService from "../services/WebhookService/DeleteWebHookService";
import UpdateWebHookService from "../services/WebhookService/UpdateWebHookService";
import GetWebHookService from "../services/WebhookService/GetWebHookService";
import DispatchWebHookService from "../services/WebhookService/DispatchWebHookService";
import ListFlowBuilderService from "../services/FlowBuilderService/ListFlowBuilderService";
import CreateFlowBuilderService from "../services/FlowBuilderService/CreateFlowBuilderService";
import UpdateFlowBuilderService from "../services/FlowBuilderService/UpdateFlowBuilderService";
import DeleteFlowBuilderService from "../services/FlowBuilderService/DeleteFlowBuilderService";
import GetFlowBuilderService from "../services/FlowBuilderService/GetFlowBuilderService";
import FlowUpdateDataService from "../services/FlowBuilderService/FlowUpdateDataService";
import FlowsGetDataService from "../services/FlowBuilderService/FlowsGetDataService";
import UploadImgFlowBuilderService from "../services/FlowBuilderService/UploadImgFlowBuilderService";
import UploadAudioFlowBuilderService from "../services/FlowBuilderService/UploadAudioFlowBuilderService";
import DuplicateFlowBuilderService from "../services/FlowBuilderService/DuplicateFlowBuilderService";
import UploadAllFlowBuilderService from "../services/FlowBuilderService/UploadAllFlowBuilderService";
import ExportFlowBuilderService from "../services/FlowBuilderService/ExportFlowBuilderService";
import ImportFlowBuilderService from "../services/FlowBuilderService/ImportFlowBuilderService";
import fs from "fs";
import TestFlowBuilderService from "../services/FlowBuilderService/TestFlowBuilderService";
import { FlowBuilderModel } from "../models/FlowBuilder";
import { randomString } from "../utils/randomCode";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import { ActionsWebhookService } from "../services/WebhookService/ActionsWebhookService";
// import { handleMessage } from "../services/FacebookServices/facebookMessageListener";

export const createFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name } = req.body;
  const userId = parseInt(req.user.id);
  const { companyId } = req.user;

  const flow = await CreateFlowBuilderService({
    userId,
    name,
    companyId
  });

  if (flow === "exist") {
    return res.status(402).json("exist");
  }

  return res.status(200).json(flow);
};

export const updateFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { flowId, name } = req.body;

  const flow = await UpdateFlowBuilderService({ companyId, name, flowId });

  if(flow === 'exist'){
    return res.status(402).json('exist')
  }

  return res.status(200).json(flow);
};

export const deleteFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;

  const flowIdInt = parseInt(idFlow);

  const flow = await DeleteFlowBuilderService(flowIdInt);

  return res.status(200).json(flow);
};

export const myFlows = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  console.log(`[myFlows] Buscando fluxos para companyId: ${companyId}`);

  const flows = await ListFlowBuilderService({
    companyId
  });

  console.log(`[myFlows] Fluxos encontrados: ${flows.flows?.length || 0}`, flows);

  return res.status(200).json(flows);
};

export const flowOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;

  const { companyId } = req.user;

  const idFlowInt = parseInt(idFlow);

  const webhook = await GetFlowBuilderService({
    companyId,
    idFlow: idFlowInt
  });

  return res.status(200).json(webhook);
};

export const FlowDataUpdate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = parseInt(req.user.id);

  const bodyData = req.body;

  const { companyId } = req.user;

  const keys = Object.keys(bodyData);

  console.log(keys);

  const webhook = await FlowUpdateDataService({
    companyId,
    bodyData
  });

  return res.status(200).json(webhook);
};

export const FlowDataGetOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;

  const { companyId } = req.user;

  const idFlowInt = parseInt(idFlow);

  const webhook = await FlowsGetDataService({
    companyId,
    idFlow: idFlowInt
  });

  return res.status(200).json(webhook);
};

export const FlowUploadImg = async (req: Request, res: Response) => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  if (medias.length === 0) {
    return res.status(400).json("No File");
  }

  let nameFile = medias[0].filename;

  if (medias[0].filename.split(".").length === 1) {
    nameFile = medias[0].filename + "." + medias[0].mimetype.split("/")[1];
  }

  const img = await UploadImgFlowBuilderService({
    userId,
    name: nameFile,
    companyId
  });
  return res.status(200).json(img);
};

export const FlowUploadAudio = async (req: Request, res: Response) => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  if (medias.length === 0) {
    return res.status(400).json("No File");
  }

  let nameFile = medias[0].filename;

  if (medias[0].filename.split(".").length === 1) {
    nameFile = medias[0].filename + "." + medias[0].mimetype.split("/")[1];
  }

  const img = await UploadAudioFlowBuilderService({
    userId,
    name: nameFile,
    companyId
  });
  return res.status(200).json(img);
};

export const FlowDuplicate = async (req: Request, res: Response) => {
  const { flowId, name } = req.body;
  console.log("[FlowDuplicate] body:", req.body, "| flowId:", flowId, "| name:", name);

  const nameToUse = name && typeof name === "string" && name.trim() ? name.trim() : undefined;
  console.log("[FlowDuplicate] nameToUse:", nameToUse);

  const newFlow = await DuplicateFlowBuilderService({ id: flowId, name: nameToUse });
  console.log("[FlowDuplicate] newFlow.name:", (newFlow as any)?.name);

  return res.status(200).json(newFlow);
};


export const FlowUploadAll = async (req: Request, res: Response) => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  if (medias.length === 0) {
    return res.status(400).json("No File");
  }

  const items = await UploadAllFlowBuilderService({
    userId,
    medias: medias,
    companyId
  });
  return res.status(200).json(items);
};

export const exportFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { idFlow } = req.params;
  const { companyId } = req.user;

  const idFlowInt = parseInt(idFlow);

  try {
    const exportData = await ExportFlowBuilderService({
      companyId,
      idFlow: idFlowInt
    });

    // Definir um nome de arquivo para o download
    const flowName = exportData.name.replace(/\s+/g, "_").toLowerCase();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${flowName}_export.json`
    );
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(exportData);
  } catch (error) {
    console.error("Erro ao exportar fluxo:", error);
    return res.status(500).json({ error: "Erro ao exportar fluxo" });
  }
};

export const importFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = parseInt(req.user.id);
  const { companyId } = req.user;
  const importFile = req.file;

  if (!importFile) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  try {
    console.log(
      `Processando arquivo de importação: ${importFile.originalname}`
    );
    // Ler o arquivo do disco usando o path
    const fileContent = fs.readFileSync(importFile.path, "utf8");

    // Remover o arquivo temporário após leitura (opcional, mas recomendado)
    fs.unlinkSync(importFile.path);

    let importData;
    try {
      importData = JSON.parse(fileContent);
      console.log(
        `Dados de importação JSON parseados com sucesso. Nome do fluxo: ${importData.name}`
      );
    } catch (parseError) {
      console.error("Erro ao fazer parse do arquivo JSON:", parseError);
      return res.status(400).json({ error: "Arquivo JSON inválido" });
    }

    if (!importData || !importData.name || !importData.flow) {
      console.error("Formato de dados inválido:", {
        hasName: !!importData?.name,
        hasFlow: !!importData?.flow
      });
      return res.status(400).json({ error: "Formato de dados inválido" });
    }

    const newFlow = await ImportFlowBuilderService({
      userId,
      companyId,
      importData
    });

    return res.status(200).json(newFlow);
  } catch (error) {
    console.error("Erro ao importar fluxo:", error);
    return res
      .status(500)
      .json({ error: "Erro ao processar arquivo de importação" });
  }
};

export const testFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { idFlow } = req.params;
    const { message, contactNumber, contactName } = req.body;
    const { companyId } = req.user;

    // Validar idFlow
    if (!idFlow || isNaN(parseInt(idFlow))) {
      return res.status(400).json({
        error: "ID do fluxo inválido",
        details: "O parâmetro idFlow deve ser um número válido"
      });
    }

    console.log(`Testando fluxo ${idFlow} com mensagem: "${message}"`);

    const result = await TestFlowBuilderService({
      flowId: parseInt(idFlow),
      message,
      contactNumber,
      contactName,
      companyId
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao testar fluxo:", error);
    return res.status(500).json({
      error: "Erro ao testar fluxo",
      details: error.message
    });
  }
};

export const dispatchFlowToTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { flowId, ticketId } = req.body;
    const { companyId } = req.user;

    if (!flowId || !ticketId) {
      return res.status(400).json({ error: "flowId e ticketId são obrigatórios" });
    }

    // Carregar fluxo
    const flow = await FlowBuilderModel.findOne({
      where: { id: flowId, company_id: companyId }
    });

    if (!flow || !flow.flow) {
      return res.status(404).json({ error: "Fluxo não encontrado" });
    }

    // Carregar ticket com contato
    const ticket = await Ticket.findOne({
      where: { id: ticketId },
      include: [{ model: Contact, as: "contact" }]
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket não encontrado" });
    }

    const flowData = typeof flow.flow === "string"
      ? JSON.parse(flow.flow)
      : flow.flow;

    const nodes = flowData.nodes || [];
    const connections = flowData.connections || [];

    // Encontrar nó de início
    const startNode = nodes.find((n: any) => n.type === "start");
    if (!startNode) {
      return res.status(400).json({ error: "Fluxo sem nó de início (start)" });
    }

    // Encontrar conexão que sai do start
    const startConnection = connections.find((c: any) => c.source === startNode.id);
    if (!startConnection) {
      return res.status(400).json({ error: "Fluxo sem conexão saindo do nó start" });
    }

    // Gerar hash único para o fluxo
    const newHashFlowId = randomString(42);

    // Atualizar ticket: mover para Automação (pending, sem user, sem queue) e vincular ao fluxo
    await ticket.update({
      status: "pending",
      userId: null,
      queueId: null,
      flowWebhook: true,
      lastFlowId: startConnection.target,
      hashFlowId: newHashFlowId,
      flowStopped: flowId.toString()
    });

    // Emitir eventos de socket para mover ticket nas abas
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`)
      .to(`company-${companyId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticket
      });

    // Recarregar ticket atualizado para emitir estado correto
    await ticket.reload();

    io.to(`company-${companyId}-mainchannel`)
      .to(`company-${companyId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });

    // Montar dados do contato
    const contact = ticket.contact as Contact;
    const mountDataContact = {
      number: contact?.number || "",
      name: contact?.name || "",
      email: contact?.email || ""
    };

    // Executar primeiro nó do fluxo imediatamente
    await ActionsWebhookService(
      ticket.whatsappId,
      parseInt(flowId),
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

    return res.status(200).json({ success: true, message: "Fluxo disparado com sucesso" });
  } catch (error) {
    console.error("Erro ao disparar fluxo para ticket:", error);
    return res.status(500).json({
      error: "Erro ao disparar fluxo",
      details: error.message
    });
  }
};