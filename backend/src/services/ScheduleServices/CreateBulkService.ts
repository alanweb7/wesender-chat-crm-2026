import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import TicketTag from "../../models/TicketTag";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";

interface Request {
  body: string;
  sendAt: string;
  companyId: number;
  userId: number;
  whatsappId: number;
  ticketUserId?: number;
  queueId?: number;
  openTicket?: string;
  statusTicket?: string;
  intervalo?: number;
  valorIntervalo?: number;
  enviarQuantasVezes?: number;
  tipoDias?: number;
  contadorEnvio?: number;
  assinar?: boolean;
  sendType: "multiple" | "tag";
  contactIds?: number[];
  tagIds?: number[];
  mediaType?: string;
  arrayOption?: Array<{ number: number; value: string }>;
}

interface Response {
  schedules: Schedule[];
  count: number;
}

const CreateBulkService = async ({
  body,
  sendAt,
  companyId,
  userId,
  whatsappId,
  ticketUserId,
  queueId,
  openTicket = "enabled",
  statusTicket = "closed",
  intervalo = 1,
  valorIntervalo = 0,
  enviarQuantasVezes = 1,
  tipoDias = 4,
  contadorEnvio = 0,
  assinar = false,
  sendType,
  contactIds = [],
  tagIds = [],
  mediaType = "image",
  arrayOption = []
}: Request): Promise<Response> => {
  let targetContactIds: number[] = [];

  // Determinar quais contatos serão alvo dos lembretes
  if (sendType === "multiple") {
    targetContactIds = contactIds;
  } else if (sendType === "tag") {
    // Buscar contatos que possuem as tags selecionadas (ContactTags)
    const contactTags = await ContactTag.findAll({
      where: {
        tagId: tagIds
      },
      include: [{
        model: Contact,
        as: "contact",
        where: {
          companyId
        },
        attributes: ["id"]
      }],
      attributes: ["contactId"],
      raw: true
    });

    // Buscar contatos de tickets que possuem as tags selecionadas (TicketTags)
    const ticketTags = await TicketTag.findAll({
      where: {
        tagId: tagIds
      },
      include: [{
        model: Ticket,
        as: "ticket",
        required: true,
        include: [{
          model: Contact,
          as: "contact",
          where: {
            companyId
          },
          attributes: ["id"]
        }]
      }],
      attributes: ["ticketId"]
    });

    // Combinar contatos de ambas as fontes (ContactTags e TicketTags)
    const allContactIds = [
      ...contactTags.map(ct => ct.contactId),
      ...ticketTags.map(tt => (tt as any).ticket?.contact?.id).filter(Boolean)
    ];

    targetContactIds = [...new Set(allContactIds)];
  }

  if (targetContactIds.length === 0) {
    throw new AppError("Nenhum contato encontrado para envio", 400);
  }

  // Criar um lembrete para cada contato
  const schedules: Schedule[] = [];

  for (const contactId of targetContactIds) {
    // Converter string vazia para null para campos que devem ser integer
    const scheduleData: any = {
      body,
      sendAt,
      contactId,
      companyId,
      status: "PENDENTE",
      intervalo,
      valorIntervalo,
      enviarQuantasVezes,
      tipoDias,
      contadorEnvio,
      assinar,
      tagIds,
      mediaType,
      arrayOption
    };

    // Apenas incluir campos não nulos
    if (userId) {
      scheduleData.userId = userId;
    }
    if (whatsappId) {
      scheduleData.whatsappId = whatsappId;
    }
    if (ticketUserId) {
      scheduleData.ticketUserId = ticketUserId;
    }
    if (queueId) {
      scheduleData.queueId = queueId;
    }
    if (openTicket) {
      scheduleData.openTicket = openTicket;
    }
    if (statusTicket) {
      scheduleData.statusTicket = statusTicket;
    }

    const schedule = await Schedule.create(scheduleData);

    schedules.push(schedule);
  }

  return {
    schedules,
    count: schedules.length
  };
};

export default CreateBulkService;
