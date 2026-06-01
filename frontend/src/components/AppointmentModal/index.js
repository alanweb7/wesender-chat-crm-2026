import React, { useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const AppointmentModal = (props) => {
  const { open, onClose, appointment, onSave, initialScheduleId, initialContactId, initialClientId, initialLeadId, userServices, userConfig, existingAppointments } = props;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [status, setStatus] = useState("scheduled");
  const [scheduleId, setScheduleId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [clientId, setClientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [dayAppointments, setDayAppointments] = useState([]);

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open && appointment) {
      setTitle(appointment.title || "");
      setDescription(appointment.description || "");
      setDurationMinutes(String(appointment.durationMinutes || 60));
      setStatus(appointment.status || "scheduled");
      setScheduleId(String(appointment.scheduleId || ""));
      setServiceId(appointment.serviceId ? String(appointment.serviceId) : "");
      setClientId(appointment.clientId ? String(appointment.clientId) : "");
      
      if (appointment.startDatetime) {
        try {
          const date = new Date(appointment.startDatetime);
          const formatted = date.toISOString().slice(0, 16);
          setStartDatetime(formatted);
        } catch (e) {
          setStartDatetime("");
        }
      }
    }
  }, [open, appointment]);

  useEffect(() => {
    if (open && !appointment && initialScheduleId) {
      setScheduleId(String(initialScheduleId));
    }
  }, [open, appointment, initialScheduleId]);

  useEffect(() => {
    if (open && !appointment && initialClientId) {
      setClientId(String(initialClientId));
    }
  }, [open, appointment, initialClientId]);

  const loadData = async () => {
    try {
      const { data: schedulesRes } = await api.get("/user-schedules");
      setSchedules(schedulesRes.schedules || []);
    } catch (err) {
      console.error("Erro ao carregar agendas:", err);
    }

    // Se userServices foi passado, usar apenas esses serviços
    if (userServices && userServices.length > 0) {
      setServices(userServices);
    } else {
      try {
        const { data: servicesRes } = await api.get("/servicos");
        setServices(servicesRes.servicos || servicesRes || []);
      } catch (err) {
        console.error("Erro ao carregar serviços:", err);
      }
    }

    // Carregar contatos
    // try {
    //   const { data: contactsRes } = await api.get("/contacts", { params: { pageNumber: 1 } });
    //   setContacts(contactsRes.contacts || []);
    // } catch (err) {
    //   console.error("Erro ao carregar contatos:", err);
    // }

    // // Carregar leads
    // try {
    //   const { data: leadsRes } = await api.get("/crm/leads");
    //   setLeads(leadsRes.leads || leadsRes || []);
    // } catch (err) {
    //   console.error("Erro ao carregar leads:", err);
    // }

    // Carregar clientes
    try {
      const { data: clientsRes } = await api.get("/crm/clients");
      setClients(clientsRes.clients || clientsRes || []);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  };

  const handleServiceChange = (e) => {
    const selectedServiceId = e.target.value;
    setServiceId(selectedServiceId);
    
    // Buscar dados do serviço selecionado
    if (selectedServiceId) {
      const selectedService = services.find(s => s.id === parseInt(selectedServiceId));
      if (selectedService) {
        // Preencher duração
        if (selectedService.tempoAtendimento) {
          setDurationMinutes(String(selectedService.tempoAtendimento));
        } else {
          setDurationMinutes("60"); // Default se não tiver tempo definido
        }
        
        // Preencher título e descrição se estiverem vazios
        if (!title.trim()) {
          setTitle(selectedService.nome || "");
        }
        if (!description.trim()) {
          setDescription(selectedService.descricao || "");
        }
      } else {
        setDurationMinutes("60"); // Default se não tiver tempo definido
      }
    } else {
      setDurationMinutes("60"); // Default se nenhum serviço selecionado
    }
  };

  const resetForm = () => {
    if (!appointment) {
      setTitle("");
      setDescription("");
      setStartDatetime("");
      setDurationMinutes("60");
      setStatus("scheduled");
      setScheduleId(initialScheduleId ? String(initialScheduleId) : "");
      setServiceId("");
      setClientId(initialClientId ? String(initialClientId) : "");
      setDayAppointments([]);
    }
  };

  // Limpar campos quando o serviço for alterado para "Nenhum"
  useEffect(() => {
    if (serviceId === "") {
      // Se não for edição, limpa título e descrição
      if (!appointment) {
        setTitle("");
        setDescription("");
      }
    }
  }, [serviceId, appointment]);

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setStartDatetime(selectedDate);
    
    // Buscar compromissos da data selecionada
    if (selectedDate && existingAppointments && existingAppointments.length > 0) {
      const date = new Date(selectedDate);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Debug: mostrar no console
      console.log("Data selecionada:", selectedDate);
      console.log("startOfDay:", startOfDay);
      console.log("endOfDay:", endOfDay);
      console.log("existingAppointments:", existingAppointments);
      console.log("scheduleId:", scheduleId);
      
      // Filtrar compromissos do dia selecionado
      const dayAppointments = existingAppointments.filter(app => {
        if (appointment && app.id === appointment.id) return false; // Ignorar o próprio
        if (app.status === "cancelled" || app.status === "no_show") return false; // Ignorar cancelados
        // Manter filtro por agenda para mostrar apenas compromissos da agenda selecionada
        if (scheduleId && app.scheduleId !== parseInt(scheduleId)) {
          console.log("Filtrando por agenda - app.scheduleId:", app.scheduleId, "scheduleId:", parseInt(scheduleId));
          return false;
        }
        
        const appDate = new Date(app.startDatetime);
        console.log("Verificando appointment:", app.title, "Data:", appDate, "scheduleId:", app.scheduleId, "Dentro do range?", appDate >= startOfDay && appDate <= endOfDay);
        
        return appDate >= startOfDay && appDate <= endOfDay;
      });
      
      // Atualizar estado com compromissos do dia
      console.log("Compromissos encontrados:", dayAppointments);
      console.log("dayAppointments.length:", dayAppointments.length);
      
      // Formatar horários para exibição
      const formattedAppointments = dayAppointments.map(app => ({
        ...app,
        startTime: new Date(app.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        endTime: new Date(new Date(app.startDatetime).getTime() + app.durationMinutes * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }));
      
      console.log("Formatted appointments:", formattedAppointments);
      setDayAppointments(formattedAppointments);
      
      // Forçar atualização
      setTimeout(() => {
        console.log("dayAppointments após timeout:", dayAppointments.length);
      }, 100);
    } else {
      console.log("Condições não atendidas para buscar compromissos");
      setDayAppointments([]);
    }
  };

  const validateSchedule = () => {
    if (!startDatetime) return null;
    
    const start = new Date(startDatetime);
    const duration = parseInt(durationMinutes, 10) || 60;
    const end = new Date(start.getTime() + duration * 60000);
    
    // Se temos configurações do usuário, validar
    if (userConfig) {
      const dayOfWeek = start.getDay();
      const workDaysArray = (userConfig.workDays || "0,1,2,3,4,5,6").split(",").map(d => parseInt(d.trim(), 10));
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      
      // Validar dia de trabalho
      if (!workDaysArray.includes(dayOfWeek)) {
        return `O profissional não trabalha neste dia (${dayNames[dayOfWeek]}). Dias: ${workDaysArray.map(d => dayNames[d]).join(", ")}`;
      }
      
      // Validar horário de trabalho
      const startTime = start.toTimeString().substring(0, 5);
      const endTime = end.toTimeString().substring(0, 5);
      const userStartWork = userConfig.startWork || "00:00";
      const userEndWork = userConfig.endWork || "23:59";
      
      if (startTime < userStartWork || endTime > userEndWork) {
        return `Horário fora do expediente do profissional (${userStartWork} - ${userEndWork})`;
      }
      
      // Validar horário de almoço
      if (userConfig.lunchStart && userConfig.lunchEnd) {
        const lunchStartParts = userConfig.lunchStart.split(":");
        const lunchEndParts = userConfig.lunchEnd.split(":");
        const lunchStartMinutes = parseInt(lunchStartParts[0], 10) * 60 + parseInt(lunchStartParts[1], 10);
        const lunchEndMinutes = parseInt(lunchEndParts[0], 10) * 60 + parseInt(lunchEndParts[1], 10);
        
        const appointmentStartMinutes = start.getHours() * 60 + start.getMinutes();
        const appointmentEndMinutes = end.getHours() * 60 + end.getMinutes();
        
        const overlapsLunch = (
          (appointmentStartMinutes >= lunchStartMinutes && appointmentStartMinutes < lunchEndMinutes) ||
          (appointmentEndMinutes > lunchStartMinutes && appointmentEndMinutes <= lunchEndMinutes) ||
          (appointmentStartMinutes <= lunchStartMinutes && appointmentEndMinutes >= lunchEndMinutes)
        );
        
        if (overlapsLunch) {
          return `Conflito com horário de almoço (${userConfig.lunchStart} - ${userConfig.lunchEnd})`;
        }
      }
    }
    
    // Validar conflito com compromissos existentes
    if (existingAppointments && existingAppointments.length > 0) {
      const newStart = start.getTime();
      const newEnd = end.getTime();
      
      for (const existing of existingAppointments) {
        // Ignorar o próprio compromisso em edição
        if (appointment && existing.id === appointment.id) continue;
        // Ignorar cancelados
        if (existing.status === "cancelled" || existing.status === "no_show") continue;
        
        const existingStart = new Date(existing.startDatetime).getTime();
        const existingEnd = existingStart + existing.durationMinutes * 60000;
        
        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          const existingTime = new Date(existing.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const existingEndTime = new Date(existingStart + existing.durationMinutes * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          return `Conflito com "${existing.title}" (${existingTime} - ${existingEndTime})`;
        }
      }
    }
    
    return null;
  };

  // Gerar lista de horários ocupados para exibição
  const getOccupiedTimes = () => {
    if (!existingAppointments || existingAppointments.length === 0 || !scheduleId) {
      return [];
    }

    const occupied = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const existing of existingAppointments) {
      // Ignorar cancelados
      if (existing.status === "cancelled" || existing.status === "no_show") continue;
      // Ignorar se não for da mesma agenda
      if (existing.scheduleId !== parseInt(scheduleId)) continue;
      // Ignorar o próprio compromisso em edição
      if (appointment && existing.id === appointment.id) continue;
      
      const existingStart = new Date(existing.startDatetime);
      const existingEnd = new Date(existingStart.getTime() + existing.durationMinutes * 60000);
      
      // Apenas mostrar compromissos de hoje em diante
      if (existingStart >= today) {
        occupied.push({
          title: existing.title,
          date: existingStart.toLocaleDateString("pt-BR"),
          startTime: existingStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          endTime: existingEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          duration: existing.durationMinutes
        });
      }
    }
    
    // Ordenar por data e hora
    return occupied.sort((a, b) => new Date(a.date + ' ' + a.startTime) - new Date(b.date + ' ' + b.startTime));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!startDatetime) {
      toast.error("Data/hora de início é obrigatória");
      return;
    }
    if (!scheduleId) {
      toast.error("Selecione uma agenda");
      return;
    }
    
    // Validar agendamento
    const validationError = validateSchedule();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title,
        description,
        startDatetime,
        durationMinutes: parseInt(durationMinutes, 10),
        status,
        scheduleId: parseInt(scheduleId, 10),
        serviceId: serviceId ? parseInt(serviceId, 10) : null,
        clientId: clientId ? parseInt(clientId, 10) : null
      };

      if (appointment && appointment.id) {
        await api.put("/appointments/" + appointment.id, payload);
        toast.success("Compromisso atualizado com sucesso");
      } else {
        await api.post("/appointments", payload);
        toast.success("Compromisso criado com sucesso");
      }

      if (onSave) {
        onSave();
      }
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeSchedules = schedules.filter(s => s.active);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {appointment ? "Editar Compromisso" : "Novo Compromisso"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Título"
              fullWidth
              required
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Descrição"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Agenda"
              fullWidth
              required
              variant="outlined"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              disabled={Boolean(appointment)}
            >
              <MenuItem value="">
                <em>Selecione uma agenda</em>
              </MenuItem>
              {activeSchedules.map((schedule) => (
                <MenuItem key={schedule.id} value={String(schedule.id)}>
                  {schedule.name} {schedule.user ? "(" + schedule.user.name + ")" : ""}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Serviço (opcional)"
              fullWidth
              variant="outlined"
              value={serviceId}
              onChange={handleServiceChange}
            >
              <MenuItem value="">
                <em>Nenhum</em>
              </MenuItem>
              {services.map((service) => (
                <MenuItem key={service.id} value={String(service.id)}>
                  {service.nome} - R$ {Number(service.valorOriginal || 0).toFixed(2)}
                  {service.tempoAtendimento && ` (${service.tempoAtendimento} min)`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Cliente (opcional)"
              fullWidth
              variant="outlined"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <MenuItem value="">
                <em>Nenhum</em>
              </MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={String(client.id)}>
                  {client.name} {client.email ? `(${client.email})` : ""}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="datetime-local"
              label="Data/Hora de Início"
              fullWidth
              required
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={startDatetime}
              onChange={handleDateChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label="Duração (minutos)"
              fullWidth
              required
              variant="outlined"
              inputProps={{ min: 1 }}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Status"
              fullWidth
              variant="outlined"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="scheduled">Agendado</MenuItem>
              <MenuItem value="confirmed">Confirmado</MenuItem>
              <MenuItem value="completed">Concluído</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
              <MenuItem value="no_show">Não compareceu</MenuItem>
            </TextField>
          </Grid>

          {/* Horários ocupados do dia */}
          {console.log("Renderizando - dayAppointments.length:", dayAppointments.length) || dayAppointments.length > 0 && (
            <Grid item xs={12}>
              <Box p={2} bgcolor="#f8f9fa" borderRadius={1} border="1px solid #e0e0e0">
                <Typography variant="subtitle2" align="center" style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                  Horários já comprometidos:
                </Typography>
                <Box display="flex" justifyContent="center" flexWrap="wrap" gap={1}>
                  {dayAppointments.map((occupied, index) => {
                    console.log("Renderizando occupied:", occupied);
                    return (
                      <Typography key={index} variant="caption" style={{ fontSize: '11px', color: '#666', padding: '2px 6px', backgroundColor: '#fff', borderRadius: '2px', border: '1px solid #e0e0e0' }}>
                        {occupied.startTime} - {occupied.endTime}
                      </Typography>
                    );
                  })}
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={24} /> : appointment ? "Salvar" : "Criar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentModal;
