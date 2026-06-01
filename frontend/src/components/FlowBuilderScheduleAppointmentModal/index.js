import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  IconButton,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    minWidth: 600,
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  variableChip: {
    margin: theme.spacing(0.5),
    cursor: "pointer",
  },
  helpText: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  outputSection: {
    backgroundColor: theme.palette.grey[50],
    padding: theme.spacing(2),
    borderRadius: 4,
    marginTop: theme.spacing(2),
  },
}));

const FlowBuilderScheduleAppointmentModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [scheduleVariable, setScheduleVariable] = useState("");
  const [dateVariable, setDateVariable] = useState("");
  const [timeVariable, setTimeVariable] = useState("");
  const [titleText, setTitleText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [contactVariable, setContactVariable] = useState("{contact_id}");
  const [successMessage, setSuccessMessage] = useState("✅ Agendamento confirmado!\n📅 {appointment_date} às {appointment_time}\n👨‍🔧 Profissional: {professional_name}");
  const [unavailableMessage, setUnavailableMessage] = useState("❌ Horário indisponível.\nHorários livres:\n{available_slots}");
  const [errorMessage, setErrorMessage] = useState("Erro ao agendar. Tente novamente.");

  useEffect(() => {
    if (initialData) {
      setScheduleVariable(initialData.scheduleVariable || "");
      setDateVariable(initialData.dateVariable || "");
      setTimeVariable(initialData.timeVariable || "");
      setTitleText(initialData.titleText || "");
      setDescriptionText(initialData.descriptionText || "");
      setDurationMinutes(initialData.durationMinutes || 60);
      setContactVariable(initialData.contactVariable || "{contact_id}");
      setSuccessMessage(initialData.successMessage || "✅ Agendamento confirmado!\n📅 {appointment_date} às {appointment_time}\n👨‍🔧 Profissional: {professional_name}");
      setUnavailableMessage(initialData.unavailableMessage || "❌ Horário indisponível.\nHorários livres:\n{available_slots}");
      setErrorMessage(initialData.errorMessage || "Erro ao agendar. Tente novamente.");
    }
  }, [initialData]);

  const handleSave = () => {
    const data = {
      scheduleVariable,
      dateVariable,
      timeVariable,
      titleText,
      descriptionText,
      durationMinutes,
      contactVariable,
      successMessage,
      unavailableMessage,
      errorMessage,
      title: "Agendar Compromisso",
    };
    onSave(data);
    onClose();
  };

  const insertVariable = (variable, setter, currentValue) => {
    setter(currentValue + variable);
  };

  const availableVariables = [
    "{contact_name}",
    "{contact_number}",
    "{contact_id}",
    "{appointment_date}",
    "{appointment_time}",
    "{professional_name}",
    "{available_slots}",
    "{schedule_id}",
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>Configurar Nó de Agendamento</DialogTitle>
      <DialogContent dividers>
        
        {/* Seção: Entrada de Dados */}
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📥 Entrada de Dados</Typography>
          
          <TextField
            fullWidth
            label="Variável da Agenda (schedule_id)"
            value={scheduleVariable}
            onChange={(e) => setScheduleVariable(e.target.value)}
            placeholder="{schedule_id} ou 1"
            helperText="ID da agenda ou variável que contém o ID"
            margin="normal"
          />

          <TextField
            fullWidth
            label="Variável da Data"
            value={dateVariable}
            onChange={(e) => setDateVariable(e.target.value)}
            placeholder="{dia_escolhido} ou 2026-05-15"
            helperText="Data no formato YYYY-MM-DD ou variável"
            margin="normal"
          />

          <TextField
            fullWidth
            label="Variável do Horário"
            value={timeVariable}
            onChange={(e) => setTimeVariable(e.target.value)}
            placeholder="{horario_escolhido} ou 14:00"
            helperText="Horário no formato HH:MM ou variável"
            margin="normal"
          />
        </Box>

        {/* Seção: Detalhes do Compromisso */}
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📝 Detalhes do Compromisso</Typography>
          
          <TextField
            fullWidth
            label="Título do Compromisso"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            placeholder="Avaliação - {contact_name}"
            helperText="Pode usar variáveis como {contact_name}"
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Descrição"
            value={descriptionText}
            onChange={(e) => setDescriptionText(e.target.value)}
            placeholder="Cliente: {contact_name} | Telefone: {contact_number}"
            helperText="Informações adicionais do compromisso"
            margin="normal"
          />

          <TextField
            fullWidth
            type="number"
            label="Duração (minutos)"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Variável do Contato"
            value={contactVariable}
            onChange={(e) => setContactVariable(e.target.value)}
            placeholder="{contact_id}"
            helperText="ID do contato a ser vinculado"
            margin="normal"
          />
        </Box>

        {/* Seção: Mensagens de Resposta */}
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>💬 Mensagens de Resposta</Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Mensagem de Sucesso"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            margin="normal"
            helperText="Enviada quando o agendamento for criado com sucesso"
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Mensagem de Horário Indisponível"
            value={unavailableMessage}
            onChange={(e) => setUnavailableMessage(e.target.value)}
            margin="normal"
            helperText="Enviada quando o horário escolhido não está disponível"
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Mensagem de Erro"
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            margin="normal"
            helperText="Enviada em caso de erro no sistema"
          />
        </Box>

        {/* Variáveis Disponíveis */}
        <Box className={classes.outputSection}>
          <Typography variant="subtitle2" gutterBottom>
            Variáveis Disponíveis (clique para copiar):
          </Typography>
          <Box>
            {availableVariables.map((variable) => (
              <Chip
                key={variable}
                label={variable}
                size="small"
                className={classes.variableChip}
                onClick={() => navigator.clipboard.writeText(variable)}
              />
            ))}
          </Box>
          <Typography className={classes.helpText} style={{ marginTop: 8 }}>
            Use estas variáveis nas mensagens e nos campos de texto.
          </Typography>
        </Box>

        {/* Saídas do Nó */}
        <Box className={classes.outputSection} style={{ marginTop: 16 }}>
          <Typography variant="subtitle2" gutterBottom>
            🔀 Saídas do Nó:
          </Typography>
          <Typography variant="body2">
            • <strong>success</strong>: Agendamento criado com sucesso
          </Typography>
          <Typography variant="body2">
            • <strong>unavailable</strong>: Horário indisponível
          </Typography>
          <Typography variant="body2">
            • <strong>error</strong>: Erro no sistema
          </Typography>
        </Box>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderScheduleAppointmentModal;
