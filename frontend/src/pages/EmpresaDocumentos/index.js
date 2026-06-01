import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { useParams, useHistory } from "react-router-dom";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  InputAdornment,
  Menu,
  MenuItem,
} from "@material-ui/core";
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
} from "@material-ui/icons";

import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import ConfirmationModal from "../../components/ConfirmationModal";
import moment from "moment";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f5f5f5",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    gap: 16,
  },
  content: {
    flex: 1,
    padding: "24px",
    overflow: "auto",
  },
  card: {
    marginBottom: theme.spacing(2),
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  uploadCard: {
    border: "2px dashed #3b82f6",
    backgroundColor: "#f0f9ff",
    textAlign: "center",
    padding: theme.spacing(4),
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "#e0f2fe",
      borderColor: "#2563eb",
    },
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  statusChip: {
    fontWeight: 600,
  },
  searchField: {
    backgroundColor: "#fff",
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
}));

const EmpresaDocumentos = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { id } = useParams();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isVisibleToCompany: false,
  });

  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar dados da empresa
        const companyResponse = await api.get(`/companies/${id}`);
        setEmpresa(companyResponse.data);

        // Buscar documentos
        const documentsResponse = await api.get("/company-documents", {
          params: {
            companyId: id,
            searchParam,
          },
        });
        setDocumentos(documentsResponse.data.documents);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, searchParam]);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    if (!formData.name) {
      toast.error("Informe o nome do documento");
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("companyId", id);
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("isVisibleToCompany", formData.isVisibleToCompany);

      await api.post("/company-documents", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Documento enviado com sucesso!");
      setUploadModalOpen(false);
      setFormData({ name: "", description: "", isVisibleToCompany: false });
      setFile(null);

      // Recarregar documentos
      const documentsResponse = await api.get("/company-documents", {
        params: { companyId: id },
      });
      setDocumentos(documentsResponse.data.documents);
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      toast.error(error.response?.data?.message || "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/company-documents/${selectedDocument.id}`, {
        name: formData.name,
        description: formData.description,
        isVisibleToCompany: formData.isVisibleToCompany,
      });

      toast.success("Documento atualizado com sucesso!");
      setEditModalOpen(false);
      setSelectedDocument(null);
      setFormData({ name: "", description: "", isVisibleToCompany: false });

      // Recarregar documentos
      const documentsResponse = await api.get("/company-documents", {
        params: { companyId: id },
      });
      setDocumentos(documentsResponse.data.documents);
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
      toast.error("Erro ao atualizar documento");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/company-documents/${selectedDocument.id}`);
      toast.success("Documento excluído com sucesso!");
      setConfirmModalOpen(false);
      setSelectedDocument(null);

      // Recarregar documentos
      const documentsResponse = await api.get("/company-documents", {
        params: { companyId: id },
      });
      setDocumentos(documentsResponse.data.documents);
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
    }
  };

  const handleDownload = async (documentId) => {
    try {
      const response = await api.get(`/company-documents/${documentId}/download`, {
        responseType: "blob",
      });

      // Criar URL para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", response.headers["content-disposition"]?.split("filename=")[1]?.replace(/"/g, "") || "documento");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      toast.error("Erro ao baixar documento");
    }
  };

  const openEditModal = (document) => {
    setSelectedDocument(document);
    setFormData({
      name: document.name,
      description: document.description || "",
      isVisibleToCompany: document.isVisibleToCompany || false,
    });
    setEditModalOpen(true);
  };

  const openMenu = (event, document) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const closeMenu = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Verificar se usuário pode fazer upload (apenas admin da empresa 1)
  const canUpload = user.profile === "admin" && user.companyId === 1;

  if (loading) {
    return (
      <Box className={classes.root} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!empresa) {
    return (
      <Box className={classes.root} display="flex" justifyContent="center" alignItems="center">
        <Typography variant="h6">Empresa não encontrada</Typography>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.header}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => history.goBack()}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" style={{ fontWeight: 600 }}>
            Documentos - {empresa.name}
          </Typography>
        </Box>
        {canUpload && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadModalOpen(true)}
          >
            Enviar Documento
          </Button>
        )}
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {/* Card de Upload */}
        {canUpload && (
          <Card className={classes.uploadCard} onClick={() => setUploadModalOpen(true)}>
            <CloudUploadIcon style={{ fontSize: 48, color: "#3b82f6", marginBottom: 16 }} />
            <Typography variant="h6" style={{ color: "#3b82f6", marginBottom: 8 }}>
              Enviar Novo Documento
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Clique aqui para enviar um arquivo (PDF, DOC, XLS, imagens)
            </Typography>
          </Card>
        )}

        {/* Busca */}
        <Box mb={2}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar documentos..."
            value={searchParam}
            onChange={(e) => setSearchParam(e.target.value)}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Tabela de Documentos */}
        <Card className={classes.card}>
          <CardContent>
            <Typography variant="h6" style={{ marginBottom: 16 }}>
              Documentos ({documentos.length})
            </Typography>
            
            <TableContainer className={classes.tableContainer}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Arquivo</TableCell>
                    <TableCell>Tamanho</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Visibilidade</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentos.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <DescriptionIcon color="action" />
                          <Typography variant="body2" style={{ fontWeight: 500 }}>
                            {doc.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {doc.description || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap style={{ maxWidth: 200 }}>
                          {doc.fileName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatFileSize(doc.fileSize)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {moment(doc.createdAt).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={doc.isVisibleToCompany ? "Visível" : "Oculto"}
                          size="small"
                          className={classes.statusChip}
                          style={{
                            backgroundColor: doc.isVisibleToCompany ? "#dcfce7" : "#fee2e2",
                            color: doc.isVisibleToCompany ? "#166534" : "#991b1b",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(doc.id)}
                          title="Baixar"
                        >
                          <DownloadIcon />
                        </IconButton>
                        {canUpload && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => openEditModal(doc)}
                              title="Editar"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                openMenu(e, doc);
                              }}
                              title="Mais opções"
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {documentos.length === 0 && (
              <Box textAlign="center" py={4}>
                <DescriptionIcon style={{ fontSize: 48, color: "#ccc", marginBottom: 16 }} />
                <Typography variant="h6" color="textSecondary">
                  Nenhum documento encontrado
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Modal de Upload */}
      <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar Documento</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <TextField
              fullWidth
              label="Nome do Documento"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
            />
          </Box>
          <Box mb={2}>
            <TextField
              fullWidth
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              variant="outlined"
              multiline
              rows={3}
            />
          </Box>
          <Box mb={2}>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
              style={{ display: "none" }}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outlined" component="span" fullWidth>
                {file ? file.name : "Selecionar Arquivo"}
              </Button>
            </label>
          </Box>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isVisibleToCompany}
                  onChange={(e) => setFormData({ ...formData, isVisibleToCompany: e.target.checked })}
                />
              }
              label="Visível para a empresa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleUpload}
            color="primary"
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {uploading ? "Enviando..." : "Enviar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Documento</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <TextField
              fullWidth
              label="Nome do Documento"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
            />
          </Box>
          <Box mb={2}>
            <TextField
              fullWidth
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              variant="outlined"
              multiline
              rows={3}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isVisibleToCompany}
                  onChange={(e) => setFormData({ ...formData, isVisibleToCompany: e.target.checked })}
                />
              }
              label="Visível para a empresa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleEdit} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={closeMenu}
      >
        <MenuItem onClick={() => handleDownload(selectedDocument?.id)}>
          <DownloadIcon style={{ marginRight: 8 }} />
          Baixar
        </MenuItem>
        {canUpload && (
          <>
            <MenuItem onClick={() => {
              closeMenu();
              openEditModal(selectedDocument);
            }}>
              <EditIcon style={{ marginRight: 8 }} />
              Editar
            </MenuItem>
            <MenuItem onClick={() => {
              closeMenu();
              setConfirmModalOpen(true);
            }}>
              <DeleteIcon style={{ marginRight: 8 }} />
              Excluir
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Modal de Confirmação */}
      <ConfirmationModal
        title="Excluir Documento"
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDelete}
      >
        Tem certeza que deseja excluir o documento "{selectedDocument?.name}"? Esta ação não pode ser desfeita.
      </ConfirmationModal>
    </Box>
  );
};

export default EmpresaDocumentos;
