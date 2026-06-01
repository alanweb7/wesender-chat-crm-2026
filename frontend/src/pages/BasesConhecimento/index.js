import React, { useContext, useEffect, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import LibraryBooksIcon from "@material-ui/icons/LibraryBooks";
import LinkIcon from "@material-ui/icons/Link";
import TextFieldsIcon from "@material-ui/icons/TextFields";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "transparent",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  content: { padding: "24px" },
  baseCard: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  baseHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    cursor: "pointer",
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },
  itemRow: { backgroundColor: theme.palette.background.default },
  typeChip: { fontSize: 11, height: 22 },
  addItemForm: { padding: 16, backgroundColor: "#f9f9f9" },
}));

const TYPE_LABELS = { text: "Texto", link: "Link", pdf: "PDF", image: "Imagem" };
const TYPE_ICONS = {
  text: <TextFieldsIcon fontSize="small" />,
  link: <LinkIcon fontSize="small" />,
  pdf: <AttachFileIcon fontSize="small" />,
  image: <AttachFileIcon fontSize="small" />,
};

// ── Modal de criar/editar base ───────────────────────────────────────────────
function BaseModal({ open, base, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (base) { setName(base.name || ""); setDescription(base.description || ""); }
    else { setName(""); setDescription(""); }
  }, [base, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome da base."); return; }
    setSaving(true);
    try {
      if (base) {
        await api.put(`/knowledge-bases/${base.id}`, { name, description });
        toast.success("Base atualizada!");
      } else {
        await api.post("/knowledge-bases", { name, description });
        toast.success("Base criada!");
      }
      onSaved();
      onClose();
    } catch (err) { toastError(err); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{base ? "Editar base" : "Nova base de conhecimento"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Nome da base *"
          fullWidth
          variant="outlined"
          size="small"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <TextField
          label="Descrição (opcional)"
          fullWidth
          variant="outlined"
          size="small"
          multiline
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descreva o conteúdo desta base para ajudar a IA a entender quando usá-la..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Modal de adicionar item ──────────────────────────────────────────────────
function AddItemModal({ open, baseId, onClose, onSaved }) {
  const [type, setType] = useState("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setType("text"); setTitle(""); setContent(""); setUrl(""); setFile(null); }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      if (title) formData.append("title", title);
      if (type === "text") formData.append("content", content);
      if (type === "link") formData.append("url", url);
      if (file) formData.append("file", file);

      await api.post(`/knowledge-bases/${baseId}/items`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Item adicionado!");
      onSaved();
      onClose();
    } catch (err) { toastError(err); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar item</DialogTitle>
      <DialogContent>
        <FormControl fullWidth variant="outlined" size="small" style={{ marginBottom: 12 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={type} onChange={e => setType(e.target.value)} label="Tipo">
            <MenuItem value="text">Texto</MenuItem>
            <MenuItem value="link">Link (URL)</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="image">Imagem</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Título"
          fullWidth
          variant="outlined"
          size="small"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {type === "text" && (
          <TextField
            label="Conteúdo *"
            fullWidth
            variant="outlined"
            size="small"
            multiline
            rows={6}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Digite o texto que a IA poderá usar como referência..."
          />
        )}
        {type === "link" && (
          <TextField
            label="URL *"
            fullWidth
            variant="outlined"
            size="small"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
          />
        )}
        {(type === "pdf" || type === "image") && (
          <Button variant="outlined" component="label" fullWidth startIcon={<AttachFileIcon />}>
            {file ? file.name : `Selecionar ${type === "pdf" ? "PDF" : "imagem"}`}
            <input
              type="file"
              hidden
              accept={type === "pdf" ? "application/pdf" : "image/*"}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : "Adicionar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function BasesConhecimento() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [baseModal, setBaseModal] = useState({ open: false, base: null });
  const [itemModal, setItemModal] = useState({ open: false, baseId: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null, baseId: null });

  const fetchBases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/knowledge-bases");
      setBases(data);
    } catch (err) { toastError(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBases(); }, []);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteConfirm = async () => {
    const { type, id, baseId } = deleteModal;
    try {
      if (type === "base") {
        await api.delete(`/knowledge-bases/${id}`);
        toast.success("Base removida!");
      } else {
        await api.delete(`/knowledge-bases/${baseId}/items/${id}`);
        toast.success("Item removido!");
      }
      fetchBases();
    } catch (err) { toastError(err); }
    setDeleteModal({ open: false, type: null, id: null, baseId: null });
  };

  return (
    <div className={classes.root}>
      <Box className={classes.header}>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <LibraryBooksIcon color="primary" />
          <Typography variant="h6" style={{ fontWeight: 600 }}>Bases de Conhecimento</Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setBaseModal({ open: true, base: null })}
        >
          Nova base
        </Button>
      </Box>

      <Box className={classes.content}>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 20 }}>
          Crie bases de conhecimento com textos, links e arquivos. Vincule-as aos seus agentes de IA
          e instrua a IA no prompt a consultá-las quando necessário.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}><CircularProgress /></Box>
        ) : bases.length === 0 ? (
          <Paper style={{ padding: 40, textAlign: "center" }}>
            <LibraryBooksIcon style={{ fontSize: 48, color: "#ccc", marginBottom: 8 }} />
            <Typography color="textSecondary">Nenhuma base criada ainda.</Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              style={{ marginTop: 16 }}
              onClick={() => setBaseModal({ open: true, base: null })}
            >
              Criar primeira base
            </Button>
          </Paper>
        ) : (
          bases.map(base => (
            <Paper key={base.id} className={classes.baseCard} elevation={1}>
              <Box className={classes.baseHeader} onClick={() => toggleExpand(base.id)}>
                <Box display="flex" alignItems="center" style={{ gap: 12 }}>
                  <LibraryBooksIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="subtitle1" style={{ fontWeight: 600 }}>{base.name}</Typography>
                    {base.description && (
                      <Typography variant="caption" color="textSecondary">{base.description}</Typography>
                    )}
                  </Box>
                  <Chip
                    label={`${base.items?.length || 0} itens`}
                    size="small"
                    className={classes.typeChip}
                  />
                </Box>
                <Box display="flex" alignItems="center">
                  <Tooltip title="Editar base">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setBaseModal({ open: true, base }); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir base">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteModal({ open: true, type: "base", id: base.id }); }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {expanded[base.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
              </Box>

              <Collapse in={!!expanded[base.id]}>
                <Divider />
                <Box padding={2}>
                  <Box display="flex" justifyContent="flex-end" marginBottom={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => setItemModal({ open: true, baseId: base.id })}
                    >
                      Adicionar item
                    </Button>
                  </Box>

                  {base.items?.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" style={{ textAlign: "center", padding: 16 }}>
                      Nenhum item. Clique em "Adicionar item" para começar.
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Título</TableCell>
                          <TableCell>Conteúdo / URL</TableCell>
                          <TableCell align="right">Ação</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {base.items.map(item => (
                          <TableRow key={item.id} className={classes.itemRow}>
                            <TableCell>
                              <Chip
                                icon={TYPE_ICONS[item.type]}
                                label={TYPE_LABELS[item.type] || item.type}
                                size="small"
                                className={classes.typeChip}
                              />
                            </TableCell>
                            <TableCell>{item.title || "—"}</TableCell>
                            <TableCell style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.type === "text"
                                ? (item.content?.slice(0, 80) + (item.content?.length > 80 ? "..." : ""))
                                : (item.url || item.filePath || "—")}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Remover item">
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteModal({ open: true, type: "item", id: item.id, baseId: base.id })}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              </Collapse>
            </Paper>
          ))
        )}
      </Box>

      <BaseModal
        open={baseModal.open}
        base={baseModal.base}
        onClose={() => setBaseModal({ open: false, base: null })}
        onSaved={fetchBases}
      />
      <AddItemModal
        open={itemModal.open}
        baseId={itemModal.baseId}
        onClose={() => setItemModal({ open: false, baseId: null })}
        onSaved={fetchBases}
      />
      <ConfirmationModal
        title={deleteModal.type === "base" ? "Excluir base de conhecimento" : "Remover item"}
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: null, id: null, baseId: null })}
        onConfirm={handleDeleteConfirm}
      >
        {deleteModal.type === "base"
          ? "Todos os itens desta base serão excluídos permanentemente."
          : "O item será removido permanentemente desta base."}
      </ConfirmationModal>
    </div>
  );
}
