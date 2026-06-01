import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Chip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

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
  variableChip: {
    margin: theme.spacing(0.5),
    cursor: "pointer",
  },
}));

const FlowBuilderUpdateAppointmentModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [appointmentVariable, setAppointmentVariable] = useState("{appointment_id}");
  const [newDateVariable, setNewDateVariable] = useState("");
  const [newTimeVariable, setNewTimeVariable] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("✅ Agendamento atualizado!\n📅 Nova data: {new_date} às {new_time}");
  const [unavailableMessage, setUnavailableMessage] = useState("❌ Novo horário indisponível.\nHorários livres:\n{available_slots}");
  const [errorMessage, setErrorMessage] = useState("Erro ao atualizar agendamento.");

  useEffect(() => {
    if (initialData) {
      setAppointmentVariable(initialData.appointmentVariable || "{appointment_id}");
      setNewDateVariable(initialData.newDateVariable || "");
      setNewTimeVariable(initialData.newTimeVariable || "");
      setNewDuration(initialData.newDuration || "");
      setNewTitle(initialData.newTitle || "");
      setNewDescription(initialData.newDescription || "");
      setSuccessMessage(initialData.successMessage || "✅ Agendamento atualizado!\n📅 Nova data: {new_date} às {new_time}");
      setUnavailableMessage(initialData.unavailableMessage || "❌ Novo horário indisponível.\nHorários livres:\n{available_slots}");
      setErrorMessage(initialData.errorMessage || "Erro ao atualizar agendamento.");
    }
  }, [initialData]);

  const handleSave = () => {
    const data = {
      appointmentVariable,
      newDateVariable,
      newTimeVariable,
      newDuration,
      newTitle,
      newDescription,
      successMessage,
      unavailableMessage,
      errorMessage,
      title: "Atualizar Agendamento",
    };
    onSave(data);
    onClose();
  };

  const availableVariables = [
    "{appointment_id}",
    "{new_date}",
    "{new_time}",
    "{contact_name}",
    "{professional_name}",
    "{available_slots}",
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>Configurar Atualizar Agendamento</DialogTitle>
      <DialogContent dividers>
        
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📥 Identificação</Typography>
          
          <TextField
            fullWidth
            label="Variável do ID do Agendamento"
            value={appointmentVariable}
            onChange={(e) => setAppointmentVariable(e.target.value)}
            placeholder="{appointment_id}"
            helperText="ID do agendamento que será atualizado"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>🔄 Novos Dados (deixe vazio para manter)</Typography>
          
          <TextField
            fullWidth
            label="Nova Data (opcional)"
            value={newDateVariable}
            onChange={(e) => setNewDateVariable(e.target.value)}
            placeholder="{new_date} ou 2026-05-20"
            helperText="Deixe vazio para manter a data atual"
            margin="normal"
          />

          <TextField
            fullWidth
            label="Novo Horário (opcional)"
            value={newTimeVariable}
            onChange={(e) => setNewTimeVariable(e.target.value)}
            placeholder="{new_time} ou 15:00"
            helperText="Deixe vazio para manter o horário atual"
            margin="normal"
          />

          <TextField
            fullWidth
            type="number"
            label="Nova Duração em minutos (opcional)"
            value={newDuration}
            onChange={(e) => setNewDuration(e.target.value)}
            placeholder="90"
            helperText="Deixe vazio para manter a duração atual"
            margin="normal"
          />

          <TextField
            fullWidth
            label="Novo Título (opcional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Avaliação - {contact_name}"
            helperText="Deixe vazio para manter o título atual"
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Nova Descrição (opcional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Reagendamento solicitado pelo cliente"
            helperText="Deixe vazio para manter a descrição atual"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>💬 Mensagens de Resposta</Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mensagem de Sucesso"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mensagem de Horário Indisponível"
            value={unavailableMessage}
            onChange={(e) => setUnavailableMessage(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Mensagem de Erro"
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            margin="normal"
          />
        </Box>

        <Box className={classes.outputSection}>
          <Typography variant="subtitle2" gutterBottom>
            Variáveis Disponíveis:
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
        </Box>

        <Box className={classes.outputSection} style={{ marginTop: 16 }}>
          <Typography variant="subtitle2" gutterBottom>
            🔀 Saídas do Nó:
          </Typography>
          <Typography variant="body2">
            • <strong>success</strong>: Agendamento atualizado com sucesso
          </Typography>
          <Typography variant="body2">
            • <strong>unavailable</strong>: Novo horário indisponível
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

export default FlowBuilderUpdateAppointmentModal;
