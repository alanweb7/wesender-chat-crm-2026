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
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  chip: {
    backgroundColor: '#e0f2fe',
    color: '#0891b2',
    fontWeight: 500,
  },
  infoBox: {
    backgroundColor: '#e0f2fe',
    padding: theme.spacing(2),
    borderRadius: 4,
    marginTop: theme.spacing(2),
    border: '1px solid #0891b2',
  },
}));

const AUTO_VARIABLES = [
  { name: 'ultimo_titulo', label: 'Título' },
  { name: 'ultimo_descricao', label: 'Descrição' },
  { name: 'ultimo_data_inicio', label: 'Data/Hora Início' },
  { name: 'ultimo_data_fim', label: 'Data/Hora Fim' },
  { name: 'ultimo_duracao', label: 'Duração (min)' },
  { name: 'ultimo_status', label: 'Status' },
  { name: 'ultimo_agenda', label: 'Agenda' },
  { name: 'ultimo_servico', label: 'Serviço' },
  { name: 'ultimo_cliente_nome', label: 'Cliente Nome' },
  { name: 'ultimo_cliente_email', label: 'Cliente Email' },
  { name: 'ultimo_cliente_doc', label: 'Cliente Doc' },
];

const FlowBuilderFetchLastAppointmentModal = ({ open, onClose, onSave, initialData }) => {
  const classes = useStyles();

  const [identifierVariable, setIdentifierVariable] = useState("");

  useEffect(() => {
    if (initialData) {
      setIdentifierVariable(initialData.identifierVariable || "");
    }
  }, [initialData]);

  const handleSave = () => {
    if (!identifierVariable.trim()) {
      alert("Por favor, informe a variável de identificação do cliente.");
      return;
    }

    const data = {
      identifierVariable,
    };

    onSave(data);
    onClose();
  };

  const handleClose = () => {
    setIdentifierVariable("");
    onClose();
  };

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth classes={{ paper: classes.dialogPaper }}>
      <DialogTitle>🔍 Buscar Último Agendamento</DialogTitle>
      <DialogContent>
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Identificação do Cliente
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Ex: {{email}} ou {{documento}}"
            value={identifierVariable}
            onChange={(e) => setIdentifierVariable(e.target.value)}
          />
          <Typography className={classes.helpText}>
            Use variáveis para buscar o cliente (email ou documento)
          </Typography>
        </Box>

        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>
            ✅ Variáveis Criadas Automaticamente
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Ao encontrar um agendamento, as seguintes variáveis serão criadas automaticamente:
          </Typography>

          <Box className={classes.chipContainer}>
            {AUTO_VARIABLES.map(variable => (
              <Chip
                key={variable.name}
                label={`{{${variable.name}}}`}
                size="small"
                className={classes.chip}
              />
            ))}
          </Box>
        </Box>

        <Box className={classes.infoBox}>
          <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 8 }}>
            💡 Como usar
          </Typography>
          <Typography variant="body2" component="div">
            1. Configure a variável de identificação {'({{email}} ou {{documento}})'}<br />
            2. O sistema buscará automaticamente o último agendamento<br />
            3. Todas as variáveis acima serão criadas automaticamente<br />
            4. Use as variáveis em nós seguintes do fluxo
          </Typography>
          <Typography variant="body2" style={{ marginTop: 12, fontStyle: 'italic' }}>
            Exemplo: "Olá! Seu último agendamento foi: {'{{ultimo_titulo}}'} em {'{{ultimo_data_inicio}}'}"
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
          disabled={!identifierVariable}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderFetchLastAppointmentModal;
