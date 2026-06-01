import React, { useEffect, useState, useMemo } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  Publish as PublishIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@material-ui/icons";
import api from "../../services/api";
import useUsers from "../../hooks/useUsers";
import TagModal from "../../components/TagModal";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import { useSystemAlert } from "../../components/SystemAlert";
import TabPanel from "../../components/TabPanel";

const useStyles = makeStyles(theme => ({
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
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: 12,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    minWidth: 220,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": { borderColor: "#e0e0e0" },
      "&:hover fieldset": { borderColor: "#1976d2" },
    },
  },
  addButton: {
    borderRadius: 8,
    padding: "6px 20px",
    textTransform: "none",
    fontWeight: 600,
  },
  tabsBar: {
    padding: "0 24px",
    borderBottom: "1px solid #e0e0e0",
  },
  content: {
    padding: "0 24px 16px",
  },
  tableWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tableHead: {
    backgroundColor: "var(--sidebar-color, #1e293b)",
    "& th": {
      color: "#cbd5e1",
      fontWeight: 600,
      fontSize: "0.8rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderBottom: "none",
      padding: "14px 16px",
    },
  },
  tableBody: {
    "& td": {
      padding: "12px 16px",
      fontSize: "0.875rem",
      color: "#334155",
      borderBottom: "1px solid #f1f5f9",
    },
    "& tr:hover": {
      backgroundColor: "#f8fafc",
    },
  },
  actionBtn: {
    minWidth: "auto",
    padding: "4px 8px",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: "0.8rem",
    textTransform: "none",
  },
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderTop: "1px solid #f1f5f9",
    backgroundColor: "#fff",
    borderRadius: "0 0 12px 12px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#999",
  },
  form: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  field: {
    marginBottom: theme.spacing(2),
  },
}));

const NegociosPage = () => {
  const classes = useStyles();
  const theme = useTheme();
  const sidebarColor = theme.palette.primary.main || "#3b82f6";
  const { showConfirm } = useSystemAlert();

  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kanbanBoards, setKanbanBoards] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [kanbanTags, setKanbanTags] = useState([]);
  const [kanbanTagToAdd, setKanbanTagToAdd] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);
  const [pipelineContacts, setPipelineContacts] = useState({});
  const [activeTab, setActiveTab] = useState("negocios");
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [duplicatePipelines, setDuplicatePipelines] = useState([]);
  const [importData, setImportData] = useState(null);

  const { users, loading: loadingUsers } = useUsers();

  const [viewOpen, setViewOpen] = useState(false);
  const [viewNegocio, setViewNegocio] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const [tablePage, setTablePage] = useState(0);
  const [tagTablePage, setTagTablePage] = useState(0);
  const rowsPerPage = 10;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setKanbanBoards([]);
    setSelectedUsers([]);
    setFormOpen(false);
  };

  const loadNegocios = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/negocios");
      setNegocios(data || []);
    } catch (err) {
      console.error("Erro ao carregar funil", err);
    } finally {
      setLoading(false);
    }
  };

  const truncate = (text, maxLength = 30) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const getKanbanCount = negocio => {
    return Array.isArray(negocio.kanbanBoards) ? negocio.kanbanBoards.length : 0;
  };

  const getKanbanDetails = negocio => {
    if (!negocio || !Array.isArray(negocio.kanbanBoards)) return [];
    return negocio.kanbanBoards.map(id => {
      const tag = kanbanTags.find(t => t.id === id);
      return {
        id,
        name: tag ? tag.name : String(id)
      };
    });
  };

  const loadKanbanTags = async () => {
    setTagsLoading(true);
    try {
      const { data } = await api.get("/tags", {
        params: { kanban: 1 }
      });
      setKanbanTags(data.tags || []);
      
      // Buscar contatos para cada pipeline
      const contactsData = {};
      for (const tag of data.tags || []) {
        try {
          const { data: contacts } = await api.get(`/contacts/tags/${tag.id}`);
          contactsData[tag.id] = contacts.length || 0;
        } catch (err) {
          console.error(`Erro ao buscar contatos do pipeline ${tag.id}:`, err);
          contactsData[tag.id] = 0;
        }
      }
      setPipelineContacts(contactsData);
    } catch (err) {
      console.error("Erro ao carregar pipelines", err);
      toastError(err);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    loadNegocios();
    loadKanbanTags();
  }, []);

  const usedKanbanTags = useMemo(() => {
    const used = new Set();
    negocios.forEach(negocio => {
      if (editingId && negocio.id === editingId) {
        return;
      }
      if (Array.isArray(negocio.kanbanBoards)) {
        negocio.kanbanBoards.forEach(tagId => used.add(tagId));
      }
    });
    return used;
  }, [negocios, editingId]);

  const availableKanbanTags = useMemo(() => {
    return kanbanTags.filter(tag => !usedKanbanTags.has(tag.id) || kanbanBoards.includes(tag.id));
  }, [kanbanTags, usedKanbanTags, kanbanBoards]);

  const filteredKanbanTags = useMemo(() => {
    if (!tagSearchTerm.trim()) {
      return kanbanTags;
    }
    const term = tagSearchTerm.trim().toLowerCase();
    return kanbanTags.filter(tag => (tag.name || "").toLowerCase().includes(term));
  }, [kanbanTags, tagSearchTerm]);

  const handleAddKanbanBoard = tagId => {
    if (!tagId) return;
    setKanbanBoards(prev => {
      if (prev.includes(tagId)) {
        return prev;
      }
      return [...prev, tagId];
    });
    setKanbanTagToAdd("");
  };

  const handleMoveKanbanBoard = (index, direction) => {
    setKanbanBoards(prev => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleRemoveKanbanBoard = tagId => {
    setKanbanBoards(prev => prev.filter(id => id !== tagId));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name,
      description,
      kanbanBoards,
      users: selectedUsers
    };

    try {
      if (editingId) {
        await api.put(`/negocios/${editingId}`, payload);
      } else {
        await api.post("/negocios", payload);
      }

      await loadNegocios();
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar funil", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = negocio => {
    setEditingId(negocio.id);
    setName(negocio.name || "");
    setDescription(negocio.description || "");
    setKanbanBoards(Array.isArray(negocio.kanbanBoards) ? negocio.kanbanBoards : []);
    setSelectedUsers(Array.isArray(negocio.users) ? negocio.users : []);
    setFormOpen(true);
  };

  const handleDelete = async id => {
    const confirmed = await showConfirm({
      type: "error",
      title: "Excluir Funil",
      message: "Deseja realmente excluir este funil?",
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/negocios/${id}`);
      await loadNegocios();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Erro ao excluir funil", err);
    }
  };

  const handleOpenTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(true);
  };

  const handleCloseTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(false);
    loadKanbanTags();
  };

  const handleEditTag = tag => {
    setSelectedTag(tag);
    setActiveTab("tags");
    setTagModalOpen(true);
  };

  const handleDeleteTag = async tagId => {
    const confirmedTag = await showConfirm({
      type: "error",
      title: "Excluir Pipeline",
      message: "Deseja realmente excluir este Pipeline?",
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
    });
    if (!confirmedTag) return;
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success("Pipeline excluído com sucesso.");
      loadKanbanTags();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDownloadFunil = async (negocio) => {
    try {
      // Buscar dados completos do funil
      const { data: funilData } = await api.get(`/negocios/${negocio.id}`);
      
      // Buscar dados completos de cada pipeline/kanban
      const pipelinesData = [];
      if (funilData.kanbanBoards && Array.isArray(funilData.kanbanBoards)) {
        for (const kanbanId of funilData.kanbanBoards) {
          try {
            const { data: kanbanData } = await api.get(`/tags/${kanbanId}`);
            // Incluir TODOS os campos do pipeline, não apenas os conhecidos
            const completePipeline = { ...kanbanData };
            pipelinesData.push(completePipeline);
            console.log("Pipeline completo exportado:", completePipeline);
          } catch (err) {
            console.error(`Erro ao buscar dados do pipeline ${kanbanId}:`, err);
          }
        }
      }

      // Estrutura completa para download - incluir todos os campos
      const exportData = {
        funil: {
          id: funilData.id,
          name: funilData.name,
          description: funilData.description,
          kanbanBoards: funilData.kanbanBoards,
          users: funilData.users,
          createdAt: funilData.createdAt,
          updatedAt: funilData.updatedAt
        },
        pipelines: pipelinesData, // Manter todos os campos originais
        exportDate: new Date().toISOString(),
        version: "1.0"
      };

      console.log("Dados completos exportados:", exportData);

      // Criar e baixar arquivo JSON
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `funil-${funilData.name || funilData.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Funil baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao baixar funil:", err);
      toastError(err);
      toast.error("Erro ao baixar funil. Tente novamente.");
    }
  };

  const handleImportFunil = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar.");
      return;
    }

    setImporting(true);
    try {
      // Ler arquivo JSON
      const fileContent = await importFile.text();
      const data = JSON.parse(fileContent);

      // Validar estrutura
      if (!data.funil || !data.pipelines) {
        throw new Error("Arquivo inválido. Estrutura do funil não encontrada.");
      }

      // Verificar nomes duplicados
      const existingPipelineNames = kanbanTags.map(tag => tag.name.toLowerCase());
      const duplicates = data.pipelines
        .filter(pipeline => existingPipelineNames.includes(pipeline.name.toLowerCase()))
        .map(pipeline => ({
          ...pipeline,
          originalName: pipeline.name,
          newName: `${pipeline.name} (Importado)`
        }));

      if (duplicates.length > 0) {
        // Abrir modal para renomear
        setImportData(data);
        setDuplicatePipelines(duplicates);
        setRenameModalOpen(true);
        setImporting(false);
        return;
      }

      // Se não houver duplicatas, importar diretamente
      await performImport(data);

    } catch (err) {
      console.error("Erro ao importar funil:", err);
      if (err instanceof SyntaxError) {
        toast.error("Arquivo JSON inválido. Verifique o formato do arquivo.");
      } else {
        toastError(err);
        toast.error("Erro ao importar funil. Tente novamente.");
      }
    } finally {
      setImporting(false);
    }
  };

  const performImport = async (dataToImport) => {
    try {
      // Criar pipelines primeiro
      const newPipelineIds = [];
      console.log("Iniciando criação de pipelines...");
      console.log("Pipelines a importar:", dataToImport.pipelines);
      
      for (const pipeline of dataToImport.pipelines) {
        try {
          console.log("Criando pipeline:", pipeline.name, pipeline);
          
          // Manter TODOS os campos originais, exceto os que não devem ser duplicados
          const pipelinePayload = { ...pipeline };
          
          // Remover campos que não devem ser duplicados
          delete pipelinePayload.id;
          delete pipelinePayload.createdAt;
          delete pipelinePayload.updatedAt;
          
          // Usar o nome (possivelmente renomeado)
          pipelinePayload.name = pipeline.newName || pipeline.name;

          console.log("Payload completo para criar pipeline:", pipelinePayload);

          const { data: createdPipeline } = await api.post("/tags", pipelinePayload);
          console.log("Pipeline criado com sucesso:", createdPipeline);
          newPipelineIds.push(createdPipeline.id);
          toast.success(`Pipeline "${pipelinePayload.name}" criado com sucesso!`);
        } catch (err) {
          console.error(`Erro ao criar pipeline ${pipeline.name}:`, err);
          console.error("Response error:", err.response?.data);
          toast.error(`Erro ao criar pipeline "${pipeline.name}": ${err.response?.data?.error || err.message}`);
        }
      }

      console.log("IDs dos novos pipelines:", newPipelineIds);

      // Criar o funil com os novos pipelines
      const funilPayload = {
        name: `${dataToImport.funil.name} (Importado)`,
        description: dataToImport.funil.description || "",
        kanbanBoards: newPipelineIds,
        users: dataToImport.funil.users || []
      };

      console.log("Payload para criar funil:", funilPayload);

      const { data: createdFunil } = await api.post("/negocios", funilPayload);
      console.log("Funil criado com sucesso:", createdFunil);
      
      toast.success(`Funil "${funilPayload.name}" importado com sucesso!`);
      
      // Fechar modais e recarregar dados
      setImportModalOpen(false);
      setRenameModalOpen(false);
      setImportFile(null);
      setImportData(null);
      setDuplicatePipelines([]);
      await loadNegocios();
      await loadKanbanTags();

    } catch (err) {
      console.error("Erro ao importar funil:", err);
      toastError(err);
      toast.error("Erro ao importar funil. Tente novamente.");
    }
  };

  const handleRenamePipeline = (index, newName) => {
    const updated = [...duplicatePipelines];
    updated[index].newName = newName;
    setDuplicatePipelines(updated);
  };

  const handleConfirmRename = () => {
    // Atualizar os dados de importação com os novos nomes
    const updatedImportData = { ...importData };
    updatedImportData.pipelines = importData.pipelines.map(pipeline => {
      const duplicate = duplicatePipelines.find(d => d.originalName === pipeline.name);
      return duplicate ? { ...pipeline, newName: duplicate.newName } : pipeline;
    });
    
    performImport(updatedImportData);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast.error("Selecione um arquivo JSON válido.");
        return;
      }
      setImportFile(file);
    }
  };

  const filteredNegocios = negocios.filter(negocio => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (negocio.name || "").toLowerCase().includes(term) ||
      (negocio.description || "").toLowerCase().includes(term)
    );
  });

  const paginatedNegocios = filteredNegocios.slice(
    tablePage * rowsPerPage,
    tablePage * rowsPerPage + rowsPerPage
  );
  const totalNegociosPages = Math.ceil(filteredNegocios.length / rowsPerPage);

  const paginatedTags = filteredKanbanTags.slice(
    tagTablePage * rowsPerPage,
    tagTablePage * rowsPerPage + rowsPerPage
  );
  const totalTagPages = Math.ceil(filteredKanbanTags.length / rowsPerPage);

  const renderPagination = (items, page, setPage, total, totalPgs) => {
    if (items.length === 0) return null;
    return (
      <Box className={classes.paginationBar}>
        <Typography variant="body2" style={{ color: "#666" }}>
          Exibindo {page * rowsPerPage + 1} a{" "}
          {Math.min((page + 1) * rowsPerPage, total)} de {total} resultado(s)
        </Typography>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)} className={classes.actionBtn}>
            Anterior
          </Button>
          {Array.from({ length: Math.min(totalPgs, 5) }, (_, i) => {
            let pageIdx = i;
            if (totalPgs > 5) {
              const start = Math.max(0, Math.min(page - 2, totalPgs - 5));
              pageIdx = start + i;
            }
            return (
              <Button
                key={pageIdx}
                size="small"
                variant={pageIdx === page ? "contained" : "text"}
                color={pageIdx === page ? "primary" : "default"}
                onClick={() => setPage(pageIdx)}
                style={{ minWidth: 32, borderRadius: 6, fontWeight: pageIdx === page ? 700 : 400 }}
              >
                {pageIdx + 1}
              </Button>
            );
          })}
          <Button size="small" disabled={page >= totalPgs - 1} onClick={() => setPage(page + 1)} className={classes.actionBtn}>
            Próximo
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box className={classes.root} style={{ "--sidebar-color": sidebarColor }}>
      <TagModal
        open={tagModalOpen}
        onClose={handleCloseTagModal}
        tagId={selectedTag ? selectedTag.id : null}
        kanban={1}
      />

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box>
            <Typography className={classes.headerTitle}>Funil</Typography>
            <Typography className={classes.headerSubtitle}>
              {negocios.length} funil(is) • {kanbanTags.length} pipeline(s)
            </Typography>
          </Box>
        </Box>
        <Box className={classes.headerRight}>
          {activeTab === "negocios" ? (
            <>
              <TextField
                size="small"
                variant="outlined"
                placeholder="Pesquisar funil..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={classes.searchField}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: "#999" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                className={classes.addButton}
                onClick={() => { resetForm(); setFormOpen(true); }}
              >
                Novo Funil
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PublishIcon />}
                className={classes.addButton}
                onClick={() => setImportModalOpen(true)}
                style={{ marginLeft: 8 }}
              >
                Importar Funil
              </Button>
            </>
          ) : (
            <>
              <TextField
                size="small"
                variant="outlined"
                placeholder="Buscar pipelines..."
                value={tagSearchTerm}
                onChange={e => setTagSearchTerm(e.target.value)}
                className={classes.searchField}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: "#999" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                className={classes.addButton}
                onClick={handleOpenTagModal}
              >
                Novo Pipeline
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box className={classes.tabsBar}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Funil" value="negocios" />
          <Tab label="Pipelines" value="tags" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box className={classes.content} style={{ marginTop: 16 }}>
        <TabPanel value={activeTab} name="negocios">
          <Box className={classes.tableWrapper}>
            <Table size="small">
              <TableHead className={classes.tableHead}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Descrição</TableCell>
                  <TableCell align="center">Pipelines</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className={classes.tableBody}>
                {loading ? (
                  <TableRowSkeleton columns={4} />
                ) : paginatedNegocios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box className={classes.emptyState}>
                        <Typography>Nenhum funil encontrado</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedNegocios.map(negocio => (
                    <TableRow
                      key={negocio.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleEdit(negocio)}
                    >
                      <TableCell>
                        <Typography style={{ fontWeight: 600, color: "#1976d2" }}>
                          {negocio.name}
                        </Typography>
                        <Typography variant="caption" style={{ color: "#999" }}>
                          ID: {negocio.id}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {truncate(negocio.description, 40) || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`${getKanbanCount(negocio)} kanban(s)`}
                          style={{ backgroundColor: "#e3f2fd", color: "#1976d2", fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" style={{ gap: 4 }}>
                          <Tooltip title="Ver detalhes">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewNegocio(negocio);
                                setViewOpen(true);
                              }}
                              style={{ color: "#059669" }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Baixar Funil">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFunil(negocio);
                              }}
                              style={{ color: "#7c3aed" }}
                            >
                              <GetAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(negocio);
                              }}
                              style={{ color: "#1976d2" }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(negocio.id);
                              }}
                              style={{ color: "#ef4444" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {renderPagination(filteredNegocios, tablePage, setTablePage, filteredNegocios.length, totalNegociosPages)}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} name="tags">
          <Box className={classes.tableWrapper}>
            <Table size="small">
              <TableHead className={classes.tableHead}>
                <TableRow>
                  <TableCell>Pipeline</TableCell>
                  <TableCell align="center">ID</TableCell>
                  <TableCell align="center">Cor</TableCell>
                  <TableCell align="center">Contatos</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className={classes.tableBody}>
                {tagsLoading ? (
                  <TableRowSkeleton columns={5} />
                ) : paginatedTags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box className={classes.emptyState}>
                        <Typography>Nenhum pipeline encontrado</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTags.map(tag => (
                    <TableRow
                      key={tag.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleEditTag(tag)}
                    >
                      <TableCell>
                        <Chip
                          label={tag.name}
                          style={{
                            backgroundColor: tag.color || "#4B5563",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">{tag.id}</TableCell>
                      <TableCell align="center">
                        <Box
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            backgroundColor: tag.color || "#4B5563",
                            margin: "0 auto",
                            border: "1px solid #e0e0e0",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={pipelineContacts[tag.id] || 0}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            fontWeight: 600,
                            fontSize: "0.75rem"
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" style={{ gap: 4 }}>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTag(tag);
                              }}
                              style={{ color: "#1976d2" }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                              }}
                              style={{ color: "#ef4444" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {renderPagination(filteredKanbanTags, tagTablePage, setTagTablePage, filteredKanbanTags.length, totalTagPages)}
          </Box>
        </TabPanel>
      </Box>

      {/* Form Dialog */}
      <Dialog open={formOpen} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? "Editar funil" : "Adicionar funil"}
        </DialogTitle>
        <DialogContent>
          <form className={classes.form} id="negocio-form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nome do funil"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  variant="outlined"
                  fullWidth
                  className={classes.field}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Descrição"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  variant="outlined"
                  fullWidth
                  className={classes.field}
                />
              </Grid>

              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="outlined" fullWidth className={classes.field}>
                      <InputLabel id="kanbanBoards-label">Adicionar Tag Kanban</InputLabel>
                      <Select
                        labelId="kanbanBoards-label"
                        value={kanbanTagToAdd}
                        onChange={e => {
                          const value = e.target.value;
                          setKanbanTagToAdd(value);
                          handleAddKanbanBoard(value);
                        }}
                        label="Adicionar Tag Kanban"
                      >
                        {availableKanbanTags.length === 0 && (
                          <MenuItem value="" disabled>
                            Nenhuma tag disponível
                          </MenuItem>
                        )}
                        {availableKanbanTags.map(tag => (
                          <MenuItem key={tag.id} value={tag.id}>
                            {tag.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Ordem das Tags Kanban (arraste com os botões para reordenar)
                    </Typography>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {kanbanBoards.length === 0 && (
                        <Typography variant="body2" color="textSecondary">
                          Nenhuma tag selecionada.
                        </Typography>
                      )}
                      {kanbanBoards.map((id, index) => {
                        const tagInfo = kanbanTags.find(tag => tag.id === id);
                        return (
                          <Chip
                            key={id}
                            label={
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong>{index + 1}.</strong> {tagInfo?.name || id}
                              </span>
                            }
                            onDelete={() => handleRemoveKanbanBoard(id)}
                            deleteIcon={<CloseIcon />}
                            style={{ backgroundColor: "#f0f4ff" }}
                            icon={
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleMoveKanbanBoard(index, -1);
                                  }}
                                  disabled={index === 0}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleMoveKanbanBoard(index, 1);
                                  }}
                                  disabled={index === kanbanBoards.length - 1}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </div>
                            }
                          />
                        );
                      })}
                    </div>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl variant="outlined" fullWidth className={classes.field}>
                  <InputLabel id="users-label">Usuários</InputLabel>
                  <Select
                    labelId="users-label"
                    multiple
                    value={selectedUsers}
                    onChange={e => setSelectedUsers(e.target.value)}
                    label="Usuários"
                    renderValue={selected => {
                      const selectedIds = selected || [];
                      const names = (users || [])
                        .filter(u => selectedIds.includes(u.id))
                        .map(u => u.name);
                      return names.join(", ");
                    }}
                  >
                    {(users || []).map(u => (
                      <MenuItem key={u.id} value={u.id}>
                        <Checkbox checked={selectedUsers.includes(u.id)} />
                        <ListItemText primary={u.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            type="submit"
            form="negocio-form"
            disabled={saving}
          >
            {editingId ? "Salvar alterações" : "Criar funil"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewNegocio(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes do funil</DialogTitle>
        <DialogContent>
          {viewNegocio && (
            <>
              <Typography variant="h6" gutterBottom>
                {viewNegocio.name}
              </Typography>
              {viewNegocio.description && (
                <Typography variant="body2" paragraph>
                  <strong>Descrição completa:</strong> {viewNegocio.description}
                </Typography>
              )}
              <Typography variant="subtitle1" gutterBottom>
                Kanbans
              </Typography>
              {getKanbanDetails(viewNegocio).length > 0 ? (
                getKanbanDetails(viewNegocio).map(k => (
                  <Typography key={k.id} variant="body2">
                    ID: {k.id} - {k.name}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2">Nenhum kanban vinculado.</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setViewOpen(false);
              setViewNegocio(null);
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importModalOpen} onClose={() => setImportModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar Funil</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Selecione um arquivo JSON de um funil exportado anteriormente. 
            O sistema irá criar novos pipelines e o funil com todas as configurações.
          </Typography>
          
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="import-file-input"
          />
          
          <label htmlFor="import-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<PublishIcon />}
              fullWidth
              style={{ marginBottom: 16 }}
            >
              {importFile ? importFile.name : "Selecionar arquivo JSON"}
            </Button>
          </label>

          {importFile && (
            <Box style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Arquivo selecionado:</strong> {importFile.name}<br/>
                <strong>Tamanho:</strong> {(importFile.size / 1024).toFixed(2)} KB<br/>
                <strong>Tipo:</strong> {importFile.type}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportModalOpen(false);
            setImportFile(null);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportFunil}
            color="primary"
            variant="contained"
            disabled={!importFile || importing}
          >
            {importing ? "Importando..." : "Importar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Duplicate Pipelines Modal */}
      <Dialog open={renameModalOpen} onClose={() => setRenameModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Renomear Pipelines Duplicados</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Os seguintes pipelines já existem no sistema. Por favor, renomeie-os para continuar com a importação:
          </Typography>
          
          {duplicatePipelines.map((pipeline, index) => (
            <Box key={pipeline.originalName} style={{ marginBottom: 16 }}>
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                Pipeline: <span style={{ color: '#f44336' }}>{pipeline.originalName}</span>
              </Typography>
              <TextField
                fullWidth
                label="Novo nome"
                value={pipeline.newName}
                onChange={(e) => handleRenamePipeline(index, e.target.value)}
                variant="outlined"
                size="small"
                helperText="Digite um nome único para este pipeline"
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRenameModalOpen(false);
            setImportData(null);
            setDuplicatePipelines([]);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmRename}
            color="primary"
            variant="contained"
            disabled={duplicatePipelines.some(p => !p.newName.trim())}
          >
            Importar com Novos Nomes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NegociosPage;