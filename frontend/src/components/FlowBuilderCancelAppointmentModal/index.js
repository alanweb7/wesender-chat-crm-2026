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
    minWidth: 500,
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

const FlowBuilderCancelAppointmentModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [appointmentVariable, setAppointmentVariable] = useState("{appointment_id}");
  const [reasonVariable, setReasonVariable] = useState("");
  const [showMessage, setShowMessage] = useState(true);
  const [successMessage, setSuccessMessage] = useState("✅ Agendamento cancelado com sucesso.\n📅 Data: {appointment_date} às {appointment_time}");
  const [errorMessage, setErrorMessage] = useState("❌ Erro ao cancelar agendamento.");

  useEffect(() => {
    if (initialData) {
      setAppointmentVariable(initialData.appointmentVariable || "{appointment_id}");
      setReasonVariable(initialData.reasonVariable || "");
      setShowMessage(initialData.showMessage !== undefined ? initialData.showMessage : true);
      setSuccessMessage(initialData.successMessage || "✅ Agendamento cancelado com sucesso.\n📅 Data: {appointment_date} às {appointment_time}");
      setErrorMessage(initialData.errorMessage || "❌ Erro ao cancelar agendamento.");
    }
  }, [initialData]);

  const handleSave = () => {
    const data = {
      appointmentVariable,
      reasonVariable,
      showMessage,
      successMessage,
      errorMessage,
      title: "Cancelar Agendamento",
    };
    onSave(data);
    onClose();
  };

  const availableVariables = [
    "{appointment_id}",
    "{appointment_date}",
    "{appointment_time}",
    "{contact_name}",
    "{professional_name}",
    "{cancel_reason}",
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>Configurar Cancelar Agendamento</DialogTitle>
      <DialogContent dividers>
        
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📥 Identificação</Typography>
          
          <TextField
            fullWidth
            label="Variável do ID do Agendamento"
            value={appointmentVariable}
            onChange={(e) => setAppointmentVariable(e.target.value)}
            placeholder="{appointment_id}"
            helperText="ID do agendamento que será cancelado"
            margin="normal"
          />

          <TextField
            fullWidth
            label="Motivo do Cancelamento (opcional)"
            value={reasonVariable}
            onChange={(e) => setReasonVariable(e.target.value)}
            placeholder="{cancel_reason} ou texto fixo"
            helperText="Motivo do cancelamento (opcional)"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>💬 Mensagens</Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={showMessage}
                onChange={(e) => setShowMessage(e.target.checked)}
                color="primary"
              />
            }
            label="Exibir mensagem ao cliente"
          />

          {showMessage && (
            <>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mensagem de Sucesso"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                margin="normal"
                helperText="Mensagem enviada quando o cancelamento for bem-sucedido"
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Mensagem de Erro"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                margin="normal"
                helperText="Mensagem enviada em caso de erro"
              />
            </>
          )}
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
            • <strong>success</strong>: Agendamento cancelado com sucesso
          </Typography>
          <Typography variant="body2">
            • <strong>error</strong>: Erro ao cancelar (agendamento não encontrado ou erro no sistema)
          </Typography>
        </Box>

        <Box className={classes.outputSection} style={{ marginTop: 16 }}>
          <Typography variant="subtitle2" gutterBottom>
            ⚠️ Importante:
          </Typography>
          <Typography variant="body2">
            O agendamento será marcado como "cancelado" no banco de dados e não poderá ser revertido por este nó.
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

export default FlowBuilderCancelAppointmentModal;
