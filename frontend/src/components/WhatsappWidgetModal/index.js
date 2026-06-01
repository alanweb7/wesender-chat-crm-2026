import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
  Divider,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Delete, FileCopy, Add } from "@material-ui/icons";
import { toast } from "react-toastify";
import { listWidgets, createWidget, deleteWidget } from "../../services/whatsappWidgetService";

const useStyles = makeStyles((theme) => ({
  codeBox: {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    borderRadius: 6,
    padding: "10px 14px",
    fontFamily: "monospace",
    fontSize: 13,
    wordBreak: "break-all",
    position: "relative",
    cursor: "pointer",
  },
  copyBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    color: "#888",
  },
  widgetRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  statsChip: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  formSection: {
    marginTop: 16,
  },
}));

const WhatsappWidgetModal = ({ open, onClose, whatsapp }) => {
  const classes = useStyles();
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    welcomeMessage: "",
    buttonColor: "#25D366",
    buttonPosition: "bottom-right",
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;

  useEffect(() => {
    if (open && whatsapp?.id) {
      fetchWidgets();
    }
  }, [open, whatsapp]);

  const fetchWidgets = async () => {
    setLoading(true);
    try {
      const { data } = await listWidgets(whatsapp.id);
      setWidgets(data);
    } catch {
      toast.error("Erro ao carregar widgets.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.warning("Informe um nome para o widget.");
      return;
    }
    setCreating(true);
    try {
      await createWidget({ ...form, whatsappId: whatsapp.id });
      toast.success("Widget criado!");
      setShowForm(false);
      setForm({ name: "", welcomeMessage: "", buttonColor: "#25D366", buttonPosition: "bottom-right" });
      fetchWidgets();
    } catch {
      toast.error("Erro ao criar widget.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (widgetId) => {
    try {
      await deleteWidget(widgetId);
      toast.success("Widget removido.");
      setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    } catch {
      toast.error("Erro ao remover widget.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.info("Copiado!"));
  };

  const snippetFor = (code) =>
    `<script src="${backendUrl}/w/${code}/embed.js"></script>`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Widget WhatsApp — {whatsapp?.name || whatsapp?.number}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Cole o snippet no footer do site. Cada clique é rastreado separadamente.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            {widgets.length === 0 && !showForm && (
              <Typography variant="body2" color="textSecondary" style={{ marginTop: 12 }}>
                Nenhum widget criado ainda.
              </Typography>
            )}

            {widgets.map((widget) => (
              <Box key={widget.id} mb={2}>
                <Box className={classes.widgetRow}>
                  <Box>
                    <Typography variant="subtitle2">{widget.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {widget.totalClicks} cliques · posição: {widget.buttonPosition}
                    </Typography>
                  </Box>
                  <Tooltip title="Remover widget">
                    <IconButton size="small" onClick={() => handleDelete(widget.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box mt={1} style={{ position: "relative" }}>
                  <Paper className={classes.codeBox} onClick={() => handleCopy(snippetFor(widget.code))}>
                    {snippetFor(widget.code)}
                    <IconButton size="small" className={classes.copyBtn}>
                      <FileCopy style={{ fontSize: 14 }} />
                    </IconButton>
                  </Paper>
                  <Typography variant="caption" color="textSecondary">
                    Clique para copiar o snippet
                  </Typography>
                </Box>
              </Box>
            ))}

            {showForm ? (
              <Box className={classes.formSection}>
                <Divider style={{ marginBottom: 16 }} />
                <Typography variant="subtitle2" gutterBottom>Novo Widget</Typography>
                <TextField
                  label="Nome do widget"
                  fullWidth
                  size="small"
                  margin="dense"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Site Principal"
                />
                <TextField
                  label="Mensagem de boas-vindas (opcional)"
                  fullWidth
                  size="small"
                  margin="dense"
                  value={form.welcomeMessage}
                  onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                  placeholder="Olá! Como posso ajudar?"
                />
                <Box display="flex" gap={2} mt={1} style={{ gap: 12 }}>
                  <Box flex={1}>
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Posição</InputLabel>
                      <Select
                        value={form.buttonPosition}
                        onChange={(e) => setForm({ ...form, buttonPosition: e.target.value })}
                      >
                        <MenuItem value="bottom-right">Direita inferior</MenuItem>
                        <MenuItem value="bottom-left">Esquerda inferior</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="caption" style={{ marginRight: 8 }}>Cor:</Typography>
                    <input
                      type="color"
                      value={form.buttonColor}
                      onChange={(e) => setForm({ ...form, buttonColor: e.target.value })}
                      style={{ width: 40, height: 32, border: "none", cursor: "pointer", borderRadius: 4 }}
                    />
                  </Box>
                </Box>
                <Box display="flex" gap={1} mt={2} style={{ gap: 8 }}>
                  <Button variant="contained" color="primary" size="small" onClick={handleCreate} disabled={creating}>
                    {creating ? <CircularProgress size={18} /> : "Criar widget"}
                  </Button>
                  <Button size="small" onClick={() => setShowForm(false)}>Cancelar</Button>
                </Box>
              </Box>
            ) : (
              <Box mt={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setShowForm(true)}
                >
                  Novo widget
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsappWidgetModal;
