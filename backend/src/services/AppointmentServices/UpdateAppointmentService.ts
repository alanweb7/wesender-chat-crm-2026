import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Appointment from "../../models/Appointment";
import UserSchedule from "../../models/UserSchedule";
import User from "../../models/User";
import UserGoogleCalendarIntegration from "../../models/UserGoogleCalendarIntegration";
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent, createGoogleCalendarEvent } from "../../helpers/googleCalendarClient";
import { Op } from "sequelize";

interface UpdateAppointmentData {
  id: string | number;
  title?: string;
  description?: string;
  startDatetime?: Date | string;
  durationMinutes?: number;
  status?: string;
  serviceId?: number | null;
  clientId?: number | null;
  contactId?: number | null;
  leadId?: number | null;
  companyId: number;
}

const UpdateAppointmentService = async (
  data: UpdateAppointmentData
): Promise<Appointment> => {
  const schema = Yup.object().shape({
    title: Yup.string().max(200),
    description: Yup.string().nullable(),
    startDatetime: Yup.date(),
    durationMinutes: Yup.number().min(1),
    status: Yup.string().oneOf(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
    serviceId: Yup.number().nullable(),
    clientId: Yup.number().nullable(),
    contactId: Yup.number().nullable(),
    leadId: Yup.number().nullable()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Validar que apenas um tipo de vínculo seja fornecido
  const vinculosCount = [data.contactId, data.leadId, data.clientId].filter(id => id !== null && id !== undefined).length;
  if (vinculosCount > 1) {
    throw new AppError("Você pode vincular apenas um: Contato, Lead ou Cliente", 400);
  }

  const appointment = await Appointment.findOne({
    where: { id: data.id, companyId: data.companyId }
  });

  if (!appointment) {
    throw new AppError("Compromisso não encontrado", 404);
  }

  if (data.startDatetime || data.durationMinutes) {
    const schedule = await UserSchedule.findOne({
      where: { id: appointment.scheduleId },
      include: [{ model: User, as: "user" }]
    });

    if (schedule) {
      const startDatetime = new Date(data.startDatetime || appointment.startDatetime);
      const durationMinutes = data.durationMinutes || appointment.durationMinutes;
      const endDatetime = new Date(startDatetime.getTime() + durationMinutes * 60000);

      const user = schedule.user;
      const userStartWork = user?.startWork || "00:00";
      const userEndWork = user?.endWork || "23:59";
      const userWorkDays = user?.workDays || "0,1,2,3,4,5,6";
      const userLunchStart = user?.lunchStart || null;
      const userLunchEnd = user?.lunchEnd || null;

      // Validar dia de trabalho
      const dayOfWeek = startDatetime.getDay();
      const workDaysArray = userWorkDays.split(",").map(d => parseInt(d.trim(), 10));
      
      if (!workDaysArray.includes(dayOfWeek)) {
        const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        throw new AppError(
          `O profissional não trabalha neste dia (${dayNames[dayOfWeek]}). Dias de trabalho: ${workDaysArray.map(d => dayNames[d]).join(", ")}`,
          400
        );
      }

      // Validar horário de trabalho
      const startTime = startDatetime.toTimeString().substring(0, 5);
      const endTime = endDatetime.toTimeString().substring(0, 5);

      if (startTime < userStartWork || endTime > userEndWork) {
        throw new AppError(
          `O compromisso deve estar dentro do horário de trabalho do profissional (${userStartWork} - ${userEndWork})`,
          400
        );
      }

      // Validar horário de almoço
      if (userLunchStart && userLunchEnd) {
        const lunchStartMinutes = parseInt(userLunchStart.split(":")[0], 10) * 60 + parseInt(userLunchStart.split(":")[1], 10);
        const lunchEndMinutes = parseInt(userLunchEnd.split(":")[0], 10) * 60 + parseInt(userLunchEnd.split(":")[1], 10);
        
        const appointmentStartMinutes = startDatetime.getHours() * 60 + startDatetime.getMinutes();
        const appointmentEndMinutes = endDatetime.getHours() * 60 + endDatetime.getMinutes();

        const overlapsLunch = (
          (appointmentStartMinutes >= lunchStartMinutes && appointmentStartMinutes < lunchEndMinutes) ||
          (appointmentEndMinutes > lunchStartMinutes && appointmentEndMinutes <= lunchEndMinutes) ||
          (appointmentStartMinutes <= lunchStartMinutes && appointmentEndMinutes >= lunchEndMinutes)
        );

        if (overlapsLunch) {
          throw new AppError(
            `O compromisso não pode ser agendado durante o horário de almoço do profissional (${userLunchStart} - ${userLunchEnd})`,
            400
          );
        }
      }

      const existingAppointments = await Appointment.findAll({
        where: {
          scheduleId: appointment.scheduleId,
          id: { [Op.ne]: appointment.id },
          status: { [Op.notIn]: ["cancelled", "no_show"] }
        }
      });

      for (const existing of existingAppointments) {
        const existingStart = new Date(existing.startDatetime).getTime();
        const existingEnd = existingStart + existing.durationMinutes * 60000;
        const newStart = startDatetime.getTime();
        const newEnd = endDatetime.getTime();

        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          throw new AppError("Já existe um compromisso neste horário", 400);
        }
      }
    }
  }

  const oldStartDatetime = new Date(appointment.startDatetime);
  const oldEndDatetime = new Date(oldStartDatetime.getTime() + appointment.durationMinutes * 60000);

  await appointment.update({
    title: data.title ?? appointment.title,
    description: data.description !== undefined ? data.description : appointment.description,
    startDatetime: data.startDatetime ? new Date(data.startDatetime) : appointment.startDatetime,
    durationMinutes: data.durationMinutes ?? appointment.durationMinutes,
    status: data.status ?? appointment.status,
    serviceId: data.serviceId !== undefined ? data.serviceId : appointment.serviceId,
    clientId: data.clientId !== undefined ? data.clientId : appointment.clientId,
    contactId: data.contactId !== undefined ? data.contactId : appointment.contactId,
    leadId: data.leadId !== undefined ? data.leadId : appointment.leadId
  });

  // Sincronizar com Google Calendar
  const schedule = await UserSchedule.findOne({
    where: { id: appointment.scheduleId }
  });

  if (schedule?.userGoogleCalendarIntegrationId) {
    try {
      const integration = await UserGoogleCalendarIntegration.findOne({
        where: { id: schedule.userGoogleCalendarIntegrationId }
      });

      if (integration && integration.accessToken) {
        // Se status mudou para 'cancelled' e tem evento no Google, deletar
        if (appointment.status === 'cancelled' && appointment.googleEventId) {
          console.log("DEBUG - Deletando evento do Google Calendar (status cancelled):", appointment.googleEventId);
          
          await deleteGoogleCalendarEvent(
            integration.accessToken,
            integration.refreshToken,
            appointment.googleEventId,
            integration.calendarId,
            appointment.companyId
          );
          
          await appointment.update({ googleEventId: null });
          console.log("DEBUG - Evento deletado do Google Calendar");
        }
        // Se status é 'confirmed' e tem evento no Google, atualizar
        else if (appointment.status === 'confirmed' && appointment.googleEventId) {
          console.log("DEBUG - Atualizando evento no Google Calendar:", appointment.googleEventId);
          
          const newStartDatetime = new Date(appointment.startDatetime);
          const newEndDatetime = new Date(newStartDatetime.getTime() + appointment.durationMinutes * 60000);

          let fullDescription = appointment.description || "";
          
          if (appointment.serviceId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Serviço ID: ${appointment.serviceId}`;
          }
          
          if (appointment.clientId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Cliente ID: ${appointment.clientId}`;
          }
          
          if (appointment.contactId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Contato ID: ${appointment.contactId}`;
          }
          
          if (appointment.leadId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Lead ID: ${appointment.leadId}`;
          }

          fullDescription += fullDescription ? "\n\n" : "";
          fullDescription += `Status: ${appointment.status}`;
          fullDescription += `\nAgendado via sistema em: ${appointment.createdAt.toLocaleDateString('pt-BR')}`;

          const googleEvent = await updateGoogleCalendarEvent(
            integration.accessToken,
            integration.refreshToken,
            appointment.googleEventId,
            {
              summary: appointment.title,
              description: fullDescription,
              start: {
                dateTime: newStartDatetime.toISOString(),
                timeZone: 'America/Sao_Paulo'
              },
              end: {
                dateTime: newEndDatetime.toISOString(),
                timeZone: 'America/Sao_Paulo'
              }
            },
            integration.calendarId,
            appointment.companyId
          );

          if (googleEvent && googleEvent.id) {
            console.log("DEBUG - Evento atualizado no Google Calendar:", googleEvent.id);
          }
        }
        // Se status mudou para 'confirmed' e NÃO tem evento no Google, criar
        else if (appointment.status === 'confirmed' && !appointment.googleEventId) {
          console.log("DEBUG - Criando evento no Google Calendar (status mudou para confirmed):", appointment.id);
          
          const newStartDatetime = new Date(appointment.startDatetime);
          const newEndDatetime = new Date(newStartDatetime.getTime() + appointment.durationMinutes * 60000);

          let fullDescription = appointment.description || "";
          
          if (appointment.serviceId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Serviço ID: ${appointment.serviceId}`;
          }
          
          if (appointment.clientId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Cliente ID: ${appointment.clientId}`;
          }
          
          if (appointment.contactId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Contato ID: ${appointment.contactId}`;
          }
          
          if (appointment.leadId) {
            fullDescription += fullDescription ? "\n\n" : "";
            fullDescription += `Lead ID: ${appointment.leadId}`;
          }

          fullDescription += fullDescription ? "\n\n" : "";
          fullDescription += `Status: ${appointment.status}`;
          fullDescription += `\nAgendado via sistema em: ${appointment.createdAt.toLocaleDateString('pt-BR')}`;

          const googleEvent = await createGoogleCalendarEvent(
            integration.accessToken,
            integration.refreshToken,
            {
              summary: appointment.title,
              description: fullDescription,
              start: {
                dateTime: newStartDatetime.toISOString(),
                timeZone: 'America/Sao_Paulo'
              },
              end: {
                dateTime: newEndDatetime.toISOString(),
                timeZone: 'America/Sao_Paulo'
              }
            },
            integration.calendarId,
            appointment.companyId
          );

          if (googleEvent && googleEvent.id) {
            await appointment.update({ googleEventId: googleEvent.id });
            console.log("DEBUG - Evento criado no Google Calendar:", googleEvent.id);
          }
        }
      }
    } catch (error) {
      console.error("ERROR - Falha ao sincronizar com Google Calendar:", error);
      // Não falhar a atualização do appointment se falhar no Google Calendar
    }
  }

  return appointment;
};

export default UpdateAppointmentService;
