import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    minWidth: 700,
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  helpText: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  infoBox: {
    backgroundColor: '#d1fae5',
    padding: theme.spacing(2),
    borderRadius: 4,
    marginTop: theme.spacing(2),
    border: '1px solid #10b981',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: theme.spacing(2),
    borderRadius: 4,
    marginTop: theme.spacing(2),
    border: '1px solid #fbbf24',
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing(2),
  },
}));

const FlowBuilderSmartAppointmentModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [identifierVariable, setIdentifierVariable] = useState("");
  const [dateVariable, setDateVariable] = useState("");
  const [timeVariable, setTimeVariable] = useState("");
  const [status, setStatus] = useState("scheduled");
  
  const [schedules, setSchedules] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSchedules();
      fetchServices();
    }
  }, [open]);

  useEffect(() => {
    if (initialData) {
      setAppointmentTitle(initialData.appointmentTitle || "");
      setDescription(initialData.description || "");
      setScheduleId(initialData.scheduleId || "");
      setServiceId(initialData.serviceId || "");
      setIdentifierVariable(initialData.identifierVariable || "");
      setDateVariable(initialData.dateVariable || "");
      setTimeVariable(initialData.timeVariable || "");
      setStatus(initialData.status || "scheduled");
    }
  }, [initialData]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      console.log("🔍 Buscando agendas...");
      const { data } = await api.get("/user-schedules");
      console.log("📋 Resposta /user-schedules:", data);
      console.log("📋 Agendas encontradas:", data.schedules);
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error("❌ Erro ao buscar agendas:", err);
      toastError(err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      console.log("🔍 Buscando serviços...");
      const { data } = await api.get("/services");
      console.log("📋 Resposta /services:", data);
      console.log("📋 Serviços encontrados:", data.services);
      setServices(data.services || []);
    } catch (err) {
      console.error("❌ Erro ao buscar serviços:", err);
      toastError(err);
      setServices([]);
    }
  };

  const handleSave = () => {
    const selectedSchedule = schedules.find(s => s.id === scheduleId);
    const selectedService = services.find(s => s.id === serviceId);
    
    const data = {
      appointmentTitle,
      description,
      scheduleId,
      scheduleName: selectedSchedule?.name,
      serviceId,
      serviceName: selectedService?.name,
      identifierVariable,
      dateVariable,
      timeVariable,
      status,
      title: "Agendamento Inteligente",
    };
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>Configurar Agendamento Inteligente</DialogTitle>
      <DialogContent dividers>
        
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📝 Informações do Compromisso</Typography>
          
          <TextField
            fullWidth
            label="Título"
            value={appointmentTitle}
            onChange={(e) => setAppointmentTitle(e.target.value)}
            placeholder="{{titulo}} ou texto fixo"
            helperText="Título do compromisso (pode usar variáveis)"
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="{{descricao}} ou texto fixo"
            helperText="Descrição adicional do compromisso (opcional)"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>🎯 Agenda e Serviço</Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <div className={classes.twoColumns}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Agenda</InputLabel>
                <Select
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                >
                  <MenuItem value="">Selecione uma agenda</MenuItem>
                  {schedules.map((schedule) => (
                    <MenuItem key={schedule.id} value={schedule.id}>
                      {schedule.name} {schedule.user ? `- ${schedule.user.name}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Serviço</InputLabel>
                <Select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  <MenuItem value="">Selecione um serviço</MenuItem>
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.nome || service.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          )}
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>👤 Cliente</Typography>
          
          <TextField
            fullWidth
            label="Identificador do Cliente"
            value={identifierVariable}
            onChange={(e) => setIdentifierVariable(e.target.value)}
            placeholder="{{email}} ou {{documento}}"
            helperText="Variável que contém o email ou documento do cliente"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📅 Data e Hora</Typography>
          
          <div className={classes.twoColumns}>
            <TextField
              fullWidth
              label="Variável de Data"
              value={dateVariable}
              onChange={(e) => setDateVariable(e.target.value)}
              placeholder="{{data}}"
              helperText="Ex: {{data}} no formato DD/MM/YYYY"
              margin="normal"
            />

            <TextField
              fullWidth
              label="Variável de Hora"
              value={timeVariable}
              onChange={(e) => setTimeVariable(e.target.value)}
              placeholder="{{hora}}"
              helperText="Ex: {{hora}} no formato HH:MM"
              margin="normal"
            />
          </div>
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>⚙️ Configurações</Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Status Inicial</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="scheduled">Agendado</MenuItem>
              <MenuItem value="confirmed">Confirmado</MenuItem>
              <MenuItem value="completed">Concluído</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box className={classes.infoBox}>
          <Typography variant="subtitle2" gutterBottom style={{ color: '#065f46' }}>
            ✅ Saída de Sucesso:
          </Typography>
          <Typography variant="body2" style={{ color: '#047857' }}>
            • O sistema verifica se o horário está disponível na agenda<br/>
            • Se disponível, cria o compromisso no banco de dados<br/>
            • O fluxo segue pela saída verde (Sucesso)<br/>
            • Variáveis criadas: {'{{'}appointment_id{'}}'}, {'{{'}appointment_status{'}}'}
          </Typography>
        </Box>

        <Box className={classes.warningBox}>
          <Typography variant="subtitle2" gutterBottom style={{ color: '#92400e' }}>
            ❌ Saída de Indisponível:
          </Typography>
          <Typography variant="body2" style={{ color: '#78350f' }}>
            • Se o horário já estiver ocupado na agenda selecionada<br/>
            • O compromisso NÃO é criado no banco de dados<br/>
            • O fluxo segue pela saída vermelha (Indisponível)<br/>
            • Você pode conectar a um nó que sugere outros horários
          </Typography>
        </Box>

        <Box className={classes.infoBox} style={{ backgroundColor: '#e0f2fe', borderColor: '#0891b2', marginTop: 16 }}>
          <Typography variant="subtitle2" gutterBottom style={{ color: '#0c4a6e' }}>
            💡 Exemplo de uso:
          </Typography>
          <Typography variant="body2" style={{ color: '#075985', fontSize: 12 }}>
            <strong>Título:</strong> Consulta com {'{{'}profissional{'}}'}<br/>
            <strong>Agenda:</strong> Dra. Ana Silva<br/>
            <strong>Serviço:</strong> Consulta Médica (30 min)<br/>
            <strong>Cliente:</strong> {'{{'}email{'}}'}<br/>
            <strong>Data:</strong> {'{{'}data_escolhida{'}}'} (ex: 15/05/2026)<br/>
            <strong>Hora:</strong> {'{{'}hora_escolhida{'}}'} (ex: 14:00)<br/><br/>
            O sistema verifica se há outro compromisso entre 14:00 e 14:30 na agenda da Dra. Ana.
          </Typography>
        </Box>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default">
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={!appointmentTitle || !scheduleId || !serviceId || !identifierVariable || !dateVariable || !timeVariable}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderSmartAppointmentModal;
