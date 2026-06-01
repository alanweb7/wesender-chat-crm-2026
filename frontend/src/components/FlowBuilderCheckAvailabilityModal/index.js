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
}));

const FlowBuilderCheckAvailabilityModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [scheduleVariable, setScheduleVariable] = useState("{schedule_id}");
  const [dateVariable, setDateVariable] = useState("{date}");
  const [saveVariable, setSaveVariable] = useState("available_slots");
  const [showMessage, setShowMessage] = useState(true);
  const [messageText, setMessageText] = useState("⏰ Horários disponíveis:\n{available_slots}");

  useEffect(() => {
    if (initialData) {
      setScheduleVariable(initialData.scheduleVariable || "{schedule_id}");
      setDateVariable(initialData.dateVariable || "{date}");
      setSaveVariable(initialData.saveVariable || "available_slots");
      setShowMessage(initialData.showMessage !== undefined ? initialData.showMessage : true);
      setMessageText(initialData.messageText || "⏰ Horários disponíveis:\n{available_slots}");
    }
  }, [initialData]);

  const handleSave = () => {
    const data = {
      scheduleVariable,
      dateVariable,
      saveVariable,
      showMessage,
      messageText,
      title: "Verificar Disponibilidade",
    };
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>Configurar Verificar Disponibilidade</DialogTitle>
      <DialogContent dividers>
        
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
            placeholder="{date} ou 2026-05-15"
            helperText="Data no formato YYYY-MM-DD ou variável"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📤 Saída</Typography>
          
          <TextField
            fullWidth
            label="Salvar resultado em variável"
            value={saveVariable}
            onChange={(e) => setSaveVariable(e.target.value)}
            placeholder="available_slots"
            helperText="Nome da variável onde os horários disponíveis serão salvos"
            margin="normal"
          />
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>💬 Mensagem</Typography>
          
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
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Texto da mensagem"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="⏰ Horários disponíveis:\n{available_slots}"
              helperText="Use {available_slots} para mostrar os horários"
              margin="normal"
            />
          )}
        </Box>

        <Box className={classes.outputSection}>
          <Typography variant="subtitle2" gutterBottom>
            📤 Variáveis criadas:
          </Typography>
          <Typography variant="body2">
            • <strong>{saveVariable}</strong>: Lista formatada de horários (ex: "08:00, 10:00, 14:00")
          </Typography>
          <Typography variant="body2">
            • <strong>{saveVariable}_array</strong>: Array de horários para uso em condições
          </Typography>
          <Typography variant="body2">
            • <strong>has_available_slots</strong>: true/false se tem horários disponíveis
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

export default FlowBuilderCheckAvailabilityModal;
