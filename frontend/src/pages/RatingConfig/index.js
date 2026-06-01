import React, { useState, useEffect, useReducer, useCallback } from "react";
import { toast } from "react-toastify";
import {
  makeStyles,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Tooltip,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import StarIcon from "@material-ui/icons/Star";
import MessageIcon from "@material-ui/icons/Message";
import LanguageIcon from "@material-ui/icons/Language";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";

import api from "../../services/api";
import ConfirmationModal from "../../components/ConfirmationModal";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import toastError from "../../errors/toastError";

// ─── Styles ──────────────────────────────────────────────────────────────────

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
  },
  searchField: {
    width: 300,
  },
  addBtn: {
    backgroundColor: "#00a884",
    color: "#fff",
    "&:hover": { backgroundColor: "#00916f" },
  },
  paper: {
    borderRadius: 8,
    overflow: "hidden",
  },
  countLabel: {
    color: "#00a884",
    fontSize: 13,
    marginTop: 2,
  },
  typeChip: {
    fontSize: 11,
  },
  // Modal
  modalTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    "& svg": { color: "#f9a825" },
  },
  tabs: {
    borderBottom: "1px solid #e0e0e0",
    marginBottom: theme.spacing(2),
    "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
    "& .Mui-selected": { color: "#00a884" },
    "& .MuiTabs-indicator": { backgroundColor: "#00a884" },
  },
  optionRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  optionName: { flex: 1 },
  optionValue: { width: 90 },
  addOptionBtn: {
    borderStyle: "dashed",
    borderColor: "#00a884",
    color: "#00a884",
    "&:hover": { backgroundColor: "rgba(0,168,132,0.06)" },
  },
  // Preview
  previewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(2),
  },
  previewCard: {
    background: "#e5ddd5",
    borderRadius: 8,
    padding: theme.spacing(2),
    width: "100%",
    maxWidth: 360,
  },
  previewBubble: {
    background: "#fff",
    borderRadius: "0 8px 8px 8px",
    padding: "10px 14px",
    boxShadow: "0 1px 2px rgba(0,0,0,.13)",
    marginBottom: 8,
  },
  previewSender: {
    fontWeight: 700,
    color: "#00a884",
    fontSize: 13,
    marginBottom: 4,
  },
  previewMessage: {
    fontSize: 14,
    color: "#303030",
    whiteSpace: "pre-wrap",
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 11,
    color: "#999",
    textAlign: "right",
  },
  previewOptionsLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  previewOption: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    marginBottom: 4,
    color: "#303030",
  },
  typeSelector: {
    display: "flex",
    gap: 12,
    marginTop: theme.spacing(2),
  },
  typeCard: {
    flex: 1,
    border: "2px solid #e0e0e0",
    borderRadius: 8,
    padding: theme.spacing(2),
    cursor: "pointer",
    transition: "border-color .2s",
    "&:hover": { borderColor: "#00a884" },
  },
  typeCardSelected: {
    borderColor: "#00a884",
    background: "rgba(0,168,132,0.04)",
  },
  typeCardIcon: {
    fontSize: 28,
    color: "#555",
    marginBottom: 6,
  },
  typeCardTitle: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 2,
  },
  typeCardDesc: {
    fontSize: 12,
    color: "#777",
  },
}));

// ─── Reducer ─────────────────────────────────────────────────────────────────

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "CREATE":
      return [action.payload, ...state];
    case "UPDATE": {
      const idx = state.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        const next = [...state];
        next[idx] = action.payload;
        return next;
      }
      return state;
    }
    case "DELETE":
      return state.filter((r) => r.id !== action.payload);
    default:
      return state;
  }
};

// ─── Empty form ──────────────────────────────────────────────────────────────

const emptyForm = () => ({
  name: "",
  message: "",
  type: "message",
  options: [
    { name: "Ruim", value: 1 },
    { name: "Regular", value: 2 },
    { name: "Muito Bom", value: 4 },
  ],
});

// ─── Main Component ──────────────────────────────────────────────────────────

const RatingConfig = () => {
  const classes = useStyles();
  const [records, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(0);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState(emptyForm());
  const [tab, setTab] = useState(0);
  const [showPreview, setShowPreview] = useState(true);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: "" });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rating-configs", { params: { searchParam: search } });
      dispatch({ type: "LOAD", payload: data.records });
      setCount(data.count);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchRecords, 300);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTab(0);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      name: record.name,
      message: record.message,
      type: record.type || "message",
      options: record.options?.length
        ? record.options.map((o) => ({ name: o.name, value: o.value }))
        : [],
    });
    setTab(0);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (idx, field, value) => {
    setForm((prev) => {
      const options = [...prev.options];
      options[idx] = { ...options[idx], [field]: field === "value" ? Number(value) : value };
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { name: "", value: prev.options.length + 1 }],
    }));
  };

  const removeOption = (idx) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome da avaliação."); return; }
    if (!form.message.trim()) { toast.error("Informe a mensagem da avaliação."); return; }
    if (form.options.some((o) => !o.name.trim())) { toast.error("Preencha todos os nomes das opções."); return; }

    try {
      if (editing) {
        const { data } = await api.put(`/rating-configs/${editing.id}`, form);
        dispatch({ type: "UPDATE", payload: data });
        toast.success("Avaliação atualizada!");
      } else {
        const { data } = await api.post("/rating-configs", form);
        dispatch({ type: "CREATE", payload: data });
        toast.success("Avaliação criada!");
      }
      closeModal();
    } catch (err) {
      toastError(err);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = (record) => {
    setDeleteConfirm({ open: true, id: record.id, name: record.name });
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/rating-configs/${deleteConfirm.id}`);
      dispatch({ type: "DELETE", payload: deleteConfirm.id });
      toast.success("Avaliação excluída!");
    } catch (err) {
      toastError(err);
    } finally {
      setDeleteConfirm({ open: false, id: null, name: "" });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.header}>
        <Box>
          <Typography variant="h5" style={{ fontWeight: 700 }}>Avaliações</Typography>
          <Typography className={classes.countLabel}>{count} na lista</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={8} style={{ gap: 12 }}>
          <TextField
            className={classes.searchField}
            size="small"
            variant="outlined"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#aaa", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            className={classes.addBtn}
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            Adicionar
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Paper className={classes.paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: "#e53935", textTransform: "uppercase", fontSize: 12 }}>
                Nome
              </TableCell>
              <TableCell style={{ fontWeight: 700, color: "#e53935", textTransform: "uppercase", fontSize: 12 }}>
                Tipo
              </TableCell>
              <TableCell style={{ fontWeight: 700, color: "#e53935", textTransform: "uppercase", fontSize: 12 }}>
                Opções
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700, color: "#e53935", textTransform: "uppercase", fontSize: 12 }}>
                Ação
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={4} />
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" style={{ color: "#aaa", padding: 32 }}>
                  Nenhuma avaliação cadastrada
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      className={classes.typeChip}
                      label={record.type === "web" ? "Avaliação Web" : "Avaliação por Mensagem"}
                      icon={record.type === "web" ? <LanguageIcon style={{ fontSize: 14 }} /> : <MessageIcon style={{ fontSize: 14 }} />}
                      style={{ background: record.type === "web" ? "#e3f2fd" : "#e8f5e9", color: record.type === "web" ? "#1565c0" : "#2e7d32" }}
                    />
                  </TableCell>
                  <TableCell>
                    {record.options?.map((o) => (
                      <Chip
                        key={o.id}
                        size="small"
                        label={`${o.value} – ${o.name}`}
                        style={{ marginRight: 4, marginBottom: 2, fontSize: 11 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(record)}>
                        <EditIcon fontSize="small" style={{ color: "#00a884" }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => handleDeleteConfirm(record)}>
                        <DeleteOutlineIcon fontSize="small" style={{ color: "#e53935" }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Create/Edit Modal ── */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box className={classes.modalTitle}>
            <StarIcon />
            <span>{editing ? "Editar Avaliação" : "Criar Nova Avaliação"}</span>
          </Box>
        </DialogTitle>

        <DialogContent dividers style={{ minHeight: 380 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            className={classes.tabs}
          >
            <Tab label="Configuração Básica" />
            <Tab label="Opções de Avaliação" />
            <Tab
              label={
                <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                  Preview
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setShowPreview((p) => !p); }}
                    style={{ padding: 2 }}
                  >
                    {showPreview ? <VisibilityIcon style={{ fontSize: 14 }} /> : <VisibilityOffIcon style={{ fontSize: 14 }} />}
                  </IconButton>
                </Box>
              }
            />
          </Tabs>

          {/* Tab 0 — Configuração Básica */}
          {tab === 0 && (
            <Box>
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700 }}>
                  📋 Informações Básicas
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Nome da Avaliação"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Mensagem"
                  multiline
                  rows={3}
                  value={form.message}
                  onChange={(e) => handleFormChange("message", e.target.value)}
                />
              </Box>

              <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 8 }}>
                Tipo de Avaliação
              </Typography>
              <Box className={classes.typeSelector}>
                <Box
                  className={`${classes.typeCard} ${form.type === "message" ? classes.typeCardSelected : ""}`}
                  onClick={() => handleFormChange("type", "message")}
                >
                  <MessageIcon className={classes.typeCardIcon} style={{ color: form.type === "message" ? "#00a884" : "#555" }} />
                  <Typography className={classes.typeCardTitle}>Avaliação por Mensagem</Typography>
                  <Typography className={classes.typeCardDesc}>
                    Cliente avalia direto no WhatsApp através de opções numéricas
                  </Typography>
                </Box>
                <Box
                  className={`${classes.typeCard} ${form.type === "web" ? classes.typeCardSelected : ""}`}
                  onClick={() => handleFormChange("type", "web")}
                >
                  <LanguageIcon className={classes.typeCardIcon} style={{ color: form.type === "web" ? "#00a884" : "#555" }} />
                  <Typography className={classes.typeCardTitle}>Avaliação Web</Typography>
                  <Typography className={classes.typeCardDesc}>
                    Cliente recebe um link para avaliar em uma página personalizada
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Tab 1 — Opções */}
          {tab === 1 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700 }}>
                ⭐ Opções de Avaliação
              </Typography>
              {form.options.map((opt, idx) => (
                <Box key={idx} className={classes.optionRow}>
                  <TextField
                    className={classes.optionName}
                    variant="outlined"
                    size="small"
                    label="Nome da Opção"
                    value={opt.name}
                    onChange={(e) => handleOptionChange(idx, "name", e.target.value)}
                  />
                  <TextField
                    className={classes.optionValue}
                    variant="outlined"
                    size="small"
                    label="Valor"
                    type="number"
                    value={opt.value}
                    onChange={(e) => handleOptionChange(idx, "value", e.target.value)}
                    inputProps={{ min: 0, max: 10 }}
                  />
                  <Tooltip title="Remover opção">
                    <IconButton size="small" onClick={() => removeOption(idx)} style={{ color: "#e53935" }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
              <Button
                fullWidth
                variant="outlined"
                className={classes.addOptionBtn}
                startIcon={<AddCircleOutlineIcon />}
                onClick={addOption}
                style={{ marginTop: 8 }}
              >
                + Adicionar Opção
              </Button>
            </Box>
          )}

          {/* Tab 2 — Preview */}
          {tab === 2 && (
            <Box>
              {showPreview ? (
                <Box className={classes.previewContainer}>
                  <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700, alignSelf: "flex-start" }}>
                    👁 Preview — Mensagem WhatsApp
                  </Typography>
                  <Box className={classes.previewCard}>
                    <Box className={classes.previewBubble}>
                      <Typography className={classes.previewSender}>
                        Atendimento
                      </Typography>
                      <Typography className={classes.previewMessage}>
                        {form.message || "Mensagem da avaliação"}
                      </Typography>
                      <Typography className={classes.previewTime}>
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                      {form.options.length > 0 && (
                        <>
                          <Typography className={classes.previewOptionsLabel}>
                            Opções de Avaliação:
                          </Typography>
                          {form.options.map((o, i) => (
                            <Box key={i} className={classes.previewOption}>
                              {o.value} – {o.name || "..."}
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box textAlign="center" mt={4} color="#aaa">
                  <VisibilityOffIcon style={{ fontSize: 48 }} />
                  <Typography>Preview oculto</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions style={{ padding: "12px 16px" }}>
          <Button onClick={closeModal} variant="outlined" style={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            style={{ backgroundColor: "#00a884", color: "#fff", textTransform: "none" }}
          >
            {editing ? "Salvar Avaliação" : "Criar Avaliação"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmationModal
        title={`Excluir "${deleteConfirm.name}"?`}
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, name: "" })}
        onConfirm={handleDelete}
      >
        Esta ação não pode ser desfeita. Todas as opções vinculadas serão removidas.
      </ConfirmationModal>
    </Box>
  );
};

export default RatingConfig;
