import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import SyncEventService from "../GoogleCalendar/SyncEventService";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  ticketUserId?: number | string;
  queueId?: number | string;
  openTicket?: string;
  statusTicket?: string;
  whatsappId?: number | string;
  intervalo?: number;
  valorIntervalo?: number;
  enviarQuantasVezes?: number;
  tipoDias?: number;
  contadorEnvio?: number;
  assinar?: boolean;
  mediaType?: string;
  arrayOption?: Array<{ number: number; value: string }>;
}

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  ticketUserId,
  queueId,
  openTicket,
  statusTicket,
  whatsappId,
  intervalo,
  valorIntervalo,
  enviarQuantasVezes,
  tipoDias,
  assinar,
  contadorEnvio,
  mediaType = "image",
  arrayOption = []
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({ body, sendAt });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Converter string vazia para null para campos que devem ser integer
  const scheduleData: any = {
    body,
    sendAt,
    companyId,
    status: 'PENDENTE',
    intervalo,
    valorIntervalo,
    enviarQuantasVezes,
    tipoDias,
    assinar,
    contadorEnvio,
    mediaType,
    arrayOption
  };

  // Apenas incluir campos não nulos
  if (contactId) {
    scheduleData.contactId = contactId;
  }
  if (userId) {
    scheduleData.userId = userId;
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
  if (whatsappId) {
    scheduleData.whatsappId = whatsappId;
  }

  const schedule = await (Schedule as any).create(scheduleData);

  await schedule.reload();

  // Sincroniza com Google Calendar, se houver integração configurada para a empresa
  console.log(
    "CreateService - chamando SyncEventService para schedule",
    (schedule as any).id,
    "companyId:",
    companyId
  );
  await SyncEventService({ schedule: schedule as any });
  console.log(
    "CreateService - SyncEventService finalizado para schedule",
    (schedule as any).id
  );

  return schedule;
};

export default CreateService;
