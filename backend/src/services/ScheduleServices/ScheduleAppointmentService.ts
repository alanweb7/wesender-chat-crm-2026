import UserSchedule from "../../models/UserSchedule";
import Appointment from "../../models/Appointment";
import User from "../../models/User";
import { Op } from "sequelize";
import moment from "moment";

interface ScheduleAppointmentParams {
  action: "list_user_schedules" | "list_schedule_appointments" | "check_schedule_availability" | "create_schedule_appointment";
  companyId: number;
  scheduleId?: number;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  title?: string;
  description?: string;
  contactId?: number;
  activeOnly?: boolean;
}

interface ToolResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

const ScheduleAppointmentService = async (params: ScheduleAppointmentParams): Promise<ToolResult> => {
  const { action, companyId } = params;

  try {
    switch (action) {
      case "list_user_schedules":
        return await listUserSchedules(companyId, params.activeOnly);
      
      case "list_schedule_appointments":
        return await listScheduleAppointments(params);
      
      case "check_schedule_availability":
        return await checkScheduleAvailability(params);
      
      case "create_schedule_appointment":
        return await createScheduleAppointment(params);
      
      default:
        return {
          success: false,
          error: "Ação inválida"
        };
    }
  } catch (error: any) {
    console.error("[SCHEDULE_APPOINTMENT] Erro:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar solicitação"
    };
  }
};

// 1. Listar todas as agendas ativas da empresa
async function listUserSchedules(companyId: number, activeOnly: boolean = true): Promise<ToolResult> {
  const whereClause: any = { companyId };
  
  if (activeOnly) {
    whereClause.active = true;
  }

  const schedules = await UserSchedule.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      }
    ],
    attributes: ["id", "name", "description", "userId", "active"]
  });

  return {
    success: true,
    data: schedules.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      active: s.active,
      user: {
        id: s.user.id,
        name: s.user.name,
        email: s.user.email
      }
    })),
    message: `Encontradas ${schedules.length} agenda(s)`
  };
}

// 2. Listar compromissos de uma agenda em uma data específica
async function listScheduleAppointments(params: ScheduleAppointmentParams): Promise<ToolResult> {
  const { scheduleId, date, companyId } = params;

  if (!scheduleId || !date) {
    return {
      success: false,
      error: "scheduleId e date são obrigatórios"
    };
  }

  // Verificar se agenda existe
  const schedule = await UserSchedule.findOne({
    where: { id: scheduleId, companyId },
    include: [{ model: User, as: "user", attributes: ["name"] }]
  });

  if (!schedule) {
    return {
      success: false,
      error: "Agenda não encontrada"
    };
  }

  const startOfDay = moment(date).startOf("day").toDate();
  const endOfDay = moment(date).endOf("day").toDate();

  const appointments = await Appointment.findAll({
    where: {
      scheduleId,
      startDatetime: {
        [Op.between]: [startOfDay, endOfDay]
      } as any,
      status: {
        [Op.notIn]: ["cancelled", "no_show"]
      }
    },
    order: [["startDatetime", "ASC"]],
    attributes: ["id", "title", "description", "startDatetime", "durationMinutes", "status"]
  });

  return {
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        user: schedule.user.name
      },
      date,
      appointments: appointments.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        startTime: moment(a.startDatetime).format("HH:mm"),
        endTime: moment(a.startDatetime).add(a.durationMinutes, "minutes").format("HH:mm"),
        durationMinutes: a.durationMinutes,
        status: a.status
      }))
    },
    message: `Encontrados ${appointments.length} compromisso(s) em ${moment(date).format("DD/MM/YYYY")}`
  };
}

// 3. Verificar disponibilidade de horários
async function checkScheduleAvailability(params: ScheduleAppointmentParams): Promise<ToolResult> {
  const { scheduleId, date, companyId } = params;

  if (!scheduleId || !date) {
    return {
      success: false,
      error: "scheduleId e date são obrigatórios"
    };
  }

  // Buscar agenda e usuário
  const schedule = await UserSchedule.findOne({
    where: { id: scheduleId, companyId },
    include: [{ model: User, as: "user", attributes: ["name"] }]
  });

  if (!schedule) {
    return {
      success: false,
      error: "Agenda não encontrada"
    };
  }

  // Horário de trabalho padrão (pode ser configurável no futuro via User model)
  const workingHours = {
    start: "08:00",
    end: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00"
  };

  // Buscar compromissos do dia
  const startOfDay = moment(date).startOf("day").toDate();
  const endOfDay = moment(date).endOf("day").toDate();

  const appointments = await Appointment.findAll({
    where: {
      scheduleId,
      startDatetime: {
        [Op.between]: [startOfDay, endOfDay]
      } as any,
      status: {
        [Op.notIn]: ["cancelled", "no_show"]
      }
    },
    order: [["startDatetime", "ASC"]]
  });

  // Gerar slots disponíveis (intervalos de 30 minutos)
  const availableSlots: string[] = [];
  const occupiedSlots: Array<{time: string, title: string}> = [];

  let currentTime = moment(`${date} ${workingHours.start}`, "YYYY-MM-DD HH:mm");
  const endTime = moment(`${date} ${workingHours.end}`, "YYYY-MM-DD HH:mm");
  const lunchStart = moment(`${date} ${workingHours.lunchStart}`, "YYYY-MM-DD HH:mm");
  const lunchEnd = moment(`${date} ${workingHours.lunchEnd}`, "YYYY-MM-DD HH:mm");

  while (currentTime.isBefore(endTime)) {
    const slotTime = currentTime.format("HH:mm");
    
    // Pular horário de almoço
    if (currentTime.isBetween(lunchStart, lunchEnd, null, "[)")) {
      currentTime.add(30, "minutes");
      continue;
    }

    // Verificar se há compromisso neste horário
    const appointment = appointments.find(apt => {
      const aptStart = moment(apt.startDatetime);
      const aptEnd = moment(apt.startDatetime).add(apt.durationMinutes, "minutes");
      return currentTime.isBetween(aptStart, aptEnd, null, "[)");
    });

    if (appointment) {
      occupiedSlots.push({
        time: slotTime,
        title: appointment.title
      });
    } else {
      availableSlots.push(slotTime);
    }

    currentTime.add(30, "minutes");
  }

  return {
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        user: schedule.user.name
      },
      date: moment(date).format("DD/MM/YYYY"),
      workingHours: {
        start: workingHours.start,
        end: workingHours.end,
        lunch: `${workingHours.lunchStart} - ${workingHours.lunchEnd}`
      },
      availableSlots,
      occupiedSlots,
      summary: {
        totalSlots: availableSlots.length + occupiedSlots.length,
        available: availableSlots.length,
        occupied: occupiedSlots.length
      }
    },
    message: `${availableSlots.length} horário(s) disponível(is) em ${moment(date).format("DD/MM/YYYY")}`
  };
}

// 4. Criar novo compromisso
async function createScheduleAppointment(params: ScheduleAppointmentParams): Promise<ToolResult> {
  const { scheduleId, date, startTime, durationMinutes = 60, title, description, contactId, companyId } = params;

  // Validações
  if (!scheduleId || !date || !startTime || !title) {
    return {
      success: false,
      error: "scheduleId, date, startTime e title são obrigatórios"
    };
  }

  // Verificar se agenda existe
  const schedule = await UserSchedule.findOne({
    where: { id: scheduleId, companyId },
    include: [{ model: User, as: "user", attributes: ["name"] }]
  });

  if (!schedule) {
    return {
      success: false,
      error: "Agenda não encontrada"
    };
  }

  // Montar datetime
  const startDatetime = moment(`${date} ${startTime}`, "YYYY-MM-DD HH:mm").toDate();
  const endDatetime = moment(startDatetime).add(durationMinutes, "minutes").toDate();

  // Validar horário de trabalho
  const workStart = moment(`${date} 08:00`, "YYYY-MM-DD HH:mm");
  const workEnd = moment(`${date} 18:00`, "YYYY-MM-DD HH:mm");
  const lunchStart = moment(`${date} 12:00`, "YYYY-MM-DD HH:mm");
  const lunchEnd = moment(`${date} 13:00`, "YYYY-MM-DD HH:mm");

  if (moment(startDatetime).isBefore(workStart) || moment(endDatetime).isAfter(workEnd)) {
    return {
      success: false,
      error: `Horário fora do expediente. Horário de trabalho: 08:00 - 18:00`
    };
  }

  if (moment(startDatetime).isBetween(lunchStart, lunchEnd, null, "[)")) {
    return {
      success: false,
      error: `Horário de almoço (12:00 - 13:00). Escolha outro horário.`
    };
  }

  // Verificar conflitos
  const conflictingAppointments = await Appointment.findAll({
    where: {
      scheduleId,
      status: {
        [Op.notIn]: ["cancelled", "no_show"]
      },
      [Op.or]: [
        {
          startDatetime: {
            [Op.between]: [startDatetime, endDatetime]
          } as any
        },
        {
          [Op.and]: [
            {
              startDatetime: {
                [Op.lte]: startDatetime
              }
            }
          ] as any
        }
      ]
    } as any
  });

  // Verificar se há conflito real
  const hasConflict = conflictingAppointments.some(apt => {
    const aptEnd = moment(apt.startDatetime).add(apt.durationMinutes, "minutes");
    return moment(startDatetime).isBefore(aptEnd);
  });

  if (hasConflict) {
    return {
      success: false,
      error: `Já existe um compromisso agendado neste horário. Verifique os horários disponíveis.`
    };
  }

  // Criar compromisso
  const appointment = await Appointment.create({
    scheduleId,
    title,
    description: description || "",
    startDatetime,
    durationMinutes,
    status: "scheduled",
    contactId: contactId || null,
    companyId
  });

  return {
    success: true,
    data: {
      id: appointment.id,
      title: appointment.title,
      description: appointment.description,
      schedule: {
        id: schedule.id,
        name: schedule.name,
        user: schedule.user.name
      },
      date: moment(startDatetime).format("DD/MM/YYYY"),
      startTime: moment(startDatetime).format("HH:mm"),
      endTime: moment(startDatetime).add(durationMinutes, "minutes").format("HH:mm"),
      durationMinutes: appointment.durationMinutes,
      status: appointment.status
    },
    message: `✅ Compromisso criado com sucesso para ${moment(startDatetime).format("DD/MM/YYYY [às] HH:mm")}`
  };
}

export default ScheduleAppointmentService;
