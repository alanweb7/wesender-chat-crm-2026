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
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@material-ui/core";
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachMoney as AttachMoneyIcon,
  Settings as SettingsIcon,
  WhatsApp as WhatsAppIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  Code as ApiIcon,
  Dashboard as ViewKanbanIcon,
  Memory as SmartToyIcon,
  Extension as IntegrationInstructionsIcon,
  Person as PersonIcon,
  ContactPhone as ContactPhoneIcon,
  LocalOffer as TagIcon,
  Timeline as TimelineIcon,
  Description as DescriptionIcon,
  GetApp as GetAppIcon,
  Visibility as VisibilityIcon,
} from "@material-ui/icons";

import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
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
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    borderBottom: "1px solid #e0e0e0",
  },
  cardIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  statusChip: {
    fontWeight: 600,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: theme.spacing(2),
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  infoLabel: {
    fontSize: "0.875rem",
    color: "#666",
    fontWeight: 500,
  },
  infoValue: {
    fontSize: "1rem",
    color: "#333",
    fontWeight: 600,
  },
  featureChip: {
    margin: 2,
  },
  tabPanel: {
    padding: theme.spacing(2),
  },
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const EmpresaDetalhes = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { id } = useParams();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    usuarios: 0,
    conexoes: 0,
    filas: 0,
    contatos: 0,
    tags: 0,
    kanban: 0,
    pagamentos: 0,
  });

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        setLoading(true);
        
        // Buscar dados da empresa
        const response = await api.get(`/companies/${id}`);
        setEmpresa(response.data);

        // Buscar estatísticas
        const [
          usuariosRes,
          conexoesRes,
          filasRes,
          contatosRes,
          tagsRes,
          kanbanRes,
          pagamentosRes,
          documentosRes,
        ] = await Promise.all([
          api.get(`/users/list?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/whatsapp?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/queues?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/contacts/list?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/tags/list?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/kanbans?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/invoices?companyId=${id}`).catch(() => ({ data: [] })),
          api.get(`/company-documents?companyId=${id}`).catch(() => ({ data: { documents: [] } })),
        ]);

        setStats({
          usuarios: usuariosRes.data.length || 0,
          conexoes: conexoesRes.data.length || 0,
          filas: filasRes.data.length || 0,
          contatos: contatosRes.data.length || 0,
          tags: tagsRes.data.length || 0,
          kanban: kanbanRes.data.length || 0,
          pagamentos: pagamentosRes.data.length || 0,
        });

        setDocumentos(documentosRes.data || []);
      } catch (error) {
        console.error("Erro ao buscar empresa:", error);
        toast.error("Erro ao carregar dados da empresa");
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDownloadDocument = async (documentId) => {
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

  const handleViewDocument = async (documentId) => {
    try {
      const response = await api.get(`/company-documents/${documentId}/download`, {
        responseType: "blob",
      });

      // Criar URL para visualização em nova aba
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const newWindow = window.open(url, "_blank");
      
      // Limpar URL quando a janela for fechada
      if (newWindow) {
        newWindow.onload = () => {
          // Não remover URL imediatamente para permitir visualização
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        };
      } else {
        // Se popup bloqueado, faz download
        window.URL.revokeObjectURL(url);
        toast.error("Pop-up bloqueado. Use o botão de download.");
      }
    } catch (error) {
      console.error("Erro ao visualizar documento:", error);
      toast.error("Erro ao visualizar documento");
    }
  };

  const getStatusChip = (status) => {
    return (
      <Chip
        label={status ? "Ativo" : "Inativo"}
        className={classes.statusChip}
        style={{
          backgroundColor: status ? "#dcfce7" : "#fee2e2",
          color: status ? "#166534" : "#991b1b",
        }}
      />
    );
  };

  const getFeatureChip = (enabled, label, icon) => {
    return (
      <Chip
        icon={icon}
        label={label}
        size="small"
        className={classes.featureChip}
        style={{
          backgroundColor: enabled ? "#e0f2fe" : "#f5f5f5",
          color: enabled ? "#0369a1" : "#666",
        }}
      />
    );
  };

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
            Detalhes da Empresa
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {/* Informações Principais */}
        <Card className={classes.card}>
          <CardContent>
            <Box className={classes.cardHeader}>
              <BusinessIcon className={classes.cardIcon} />
              <Typography variant="h6">Informações Principais</Typography>
              {getStatusChip(empresa.status)}
            </Box>
            
            <div className={classes.infoGrid}>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Nome da Empresa</span>
                <span className={classes.infoValue}>{empresa.name}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>ID</span>
                <span className={classes.infoValue}>#{empresa.id}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Telefone</span>
                <span className={classes.infoValue}>{empresa.phone || "-"}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Email</span>
                <span className={classes.infoValue}>{empresa.email || "-"}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Documento</span>
                <span className={classes.infoValue}>{empresa.document || "-"}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Plano</span>
                <span className={classes.infoValue}>{empresa.plan?.name || "-"}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Vencimento</span>
                <span className={classes.infoValue}>
                  {empresa.dueDate ? moment(empresa.dueDate).format("DD/MM/YYYY") : "-"}
                </span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Recorrência</span>
                <span className={classes.infoValue}>{empresa.recurrence || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Estatísticas */}
        <Card className={classes.card} style={{ marginTop: theme.spacing(2) }}>
          <CardContent>
            <Box className={classes.cardHeader}>
              <TimelineIcon className={classes.cardIcon} />
              <Typography variant="h6">Estatísticas da Empresa</Typography>
            </Box>
            
            <div className={classes.infoGrid}>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Usuários</span>
                <span className={classes.infoValue}>{stats.usuarios}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Conexões WhatsApp</span>
                <span className={classes.infoValue}>{stats.conexoes}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Filas de Atendimento</span>
                <span className={classes.infoValue}>{stats.filas}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Contatos</span>
                <span className={classes.infoValue}>{stats.contatos}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Tags</span>
                <span className={classes.infoValue}>{stats.tags}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Kanbans</span>
                <span className={classes.infoValue}>{stats.kanban}</span>
              </div>
              <div className={classes.infoItem}>
                <span className={classes.infoLabel}>Pagamentos/Faturas</span>
                <span className={classes.infoValue}>{stats.pagamentos}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Paper square>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`Documentos (${stats.pagamentos})`} icon={<DescriptionIcon />} />
          </Tabs>
        </Paper>

        {/* Tab Panel - Documentos */}
        <TabPanel value={tabValue} index={0}>
          <Card className={classes.card}>
            <CardContent>
              <Box className={classes.cardHeader}>
                <DescriptionIcon className={classes.cardIcon} />
                <Typography variant="h6">Documentos da Empresa</Typography>
                <Chip 
                  label={`${documentos.length} documento(s)`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Arquivo</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell>Visibilidade</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="textSecondary">
                            Nenhum documento encontrado
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      documentos.map((doc) => (
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
                            <Typography variant="body2" noWrap style={{ maxWidth: 150 }}>
                              {doc.fileName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {moment(doc.createdAt).format("DD/MM/YYYY")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={doc.visible ? "Visível" : "Oculto"}
                              size="small"
                              className={classes.statusChip}
                              style={{
                                backgroundColor: doc.visible ? "#dcfce7" : "#fee2e2",
                                color: doc.visible ? "#166534" : "#991b1b",
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDocument(doc.id)}
                              title="Visualizar"
                              style={{ color: "#10b981", marginRight: 4 }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadDocument(doc.id)}
                              title="Baixar"
                              style={{ color: "#3b82f6" }}
                            >
                              <GetAppIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default EmpresaDetalhes;
