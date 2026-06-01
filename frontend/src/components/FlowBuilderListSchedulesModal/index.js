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
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import toastError from "../../errors/toastError";

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
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: theme.spacing(2),
    borderRadius: 4,
    marginTop: theme.spacing(2),
    border: '1px solid #fbbf24',
  },
  schedulesList: {
    maxHeight: 300,
    overflow: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: 4,
  },
}));

const FlowBuilderListSchedulesModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [messageText, setMessageText] = useState("📋 Escolha uma agenda:");
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Buscar agendas do backend
  useEffect(() => {
    if (open) {
      fetchSchedules();
    }
  }, [open]);

  useEffect(() => {
    if (initialData) {
      setMessageText(initialData.messageText || "📋 Escolha uma agenda:");
      if (initialData.schedules) {
        setSelectedSchedules(initialData.schedules);
      }
    }
  }, [initialData]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/schedules");
      setAvailableSchedules(data.schedules || []);
    } catch (err) {
      toastError(err);
      setAvailableSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = (schedule) => {
    const isSelected = selectedSchedules.find(s => s.id === schedule.id);
    if (isSelected) {
      setSelectedSchedules(selectedSchedules.filter(s => s.id !== schedule.id));
    } else {
      setSelectedSchedules([...selectedSchedules, schedule]);
    }
  };

  const handleSave = () => {
    const data = {
      messageText,
      schedules: selectedSchedules,
      title: "Listar Agendas",
    };
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>Configurar Menu de Agendas</DialogTitle>
      <DialogContent dividers>
        
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>📋 Selecione as Agendas</Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : availableSchedules.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Nenhuma agenda encontrada. Crie agendas primeiro.
            </Typography>
          ) : (
            <List className={classes.schedulesList}>
              {availableSchedules.map((schedule) => (
                <ListItem
                  key={schedule.id}
                  button
                  onClick={() => handleToggleSchedule(schedule)}
                  dense
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={!!selectedSchedules.find(s => s.id === schedule.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={schedule.name}
                    secondary={`${schedule.user} - ${schedule.active ? 'Ativa' : 'Inativa'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
            {selectedSchedules.length} agenda{selectedSchedules.length !== 1 ? 's' : ''} selecionada{selectedSchedules.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>💬 Mensagem</Typography>
          
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Texto da mensagem"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="📋 Escolha uma agenda:"
            helperText="Mensagem exibida antes do menu de agendas"
            margin="normal"
          />
        </Box>

        <Box className={classes.warningBox}>
          <Typography variant="subtitle2" gutterBottom style={{ color: '#92400e' }}>
            ⚠️ Como funciona:
          </Typography>
          <Typography variant="body2" style={{ color: '#78350f' }}>
            • Cada agenda selecionada terá uma <strong>saída própria</strong> no nó<br/>
            • Conecte cada saída a um fluxo diferente conforme sua necessidade<br/>
            • O cliente verá uma lista numerada para escolher a agenda<br/>
            • Cada escolha direciona para o fluxo conectado àquela saída
          </Typography>
        </Box>

        <Box className={classes.outputSection} style={{ marginTop: 16 }}>
          <Typography variant="subtitle2" gutterBottom>
            📤 Variáveis Criadas:
          </Typography>
          <Typography variant="body2">
            • <strong>selected_schedule_id</strong>: ID da agenda escolhida<br/>
            • <strong>selected_schedule_name</strong>: Nome da agenda escolhida<br/>
            • <strong>selected_schedule_user</strong>: Nome do profissional
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
          disabled={selectedSchedules.length === 0}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderListSchedulesModal;
