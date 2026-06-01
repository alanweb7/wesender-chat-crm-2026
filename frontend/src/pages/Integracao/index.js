import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import n8n from "../../assets/n8n.png";
import dialogflow from "../../assets/dialogflow.png";
import webhooks from "../../assets/webhook.png";
import typebot from "../../assets/typebot.jpg";
import flowbuilder from "../../assets/flowbuilders.png";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
} from "@material-ui/core";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import SettingsIcon from "@material-ui/icons/Settings";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import IntegrationModal from "../../components/QueueIntegrationModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import GoogleCalendarIntegrationModal from "../../components/GoogleCalendarIntegrationModal";
import FlowBuilderModal from "../../components/FlowBuilderModal";
import WebhookModal from "../../components/WebhookModal";
import AsaasModal from "../../components/AsaasModal";
import MercadoPagoModal from "../../components/MercadoPagoModal";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";

const reducer = (state, action) => {
  if (action.type === "LOAD_INTEGRATIONS") {
    const queueIntegration = action.payload;
    const newIntegrations = [];

    queueIntegration.forEach((integration) => {
      const integrationIndex = state.findIndex((u) => u.id === integration.id);
      if (integrationIndex !== -1) {
        state[integrationIndex] = integration;
      } else {
        newIntegrations.push(integration);
      }
    });

    return [...state, ...newIntegrations];
  }

  if (action.type === "UPDATE_INTEGRATIONS") {
    const queueIntegration = action.payload;
    const integrationIndex = state.findIndex((u) => u.id === queueIntegration.id);

    if (integrationIndex !== -1) {
      state[integrationIndex] = queueIntegration;
      return [...state];
    } else {
      return [queueIntegration, ...state];
    }
  }

  if (action.type === "DELETE_INTEGRATION") {
    const integrationId = action.payload;

    const integrationIndex = state.findIndex((u) => u.id === integrationId);
    if (integrationIndex !== -1) {
      state.splice(integrationIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

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
  googleButton: {
    borderRadius: 8,
    padding: "6px 16px",
    textTransform: "none",
    fontWeight: 600,
  },
  content: {
    padding: "0 24px 16px",
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f1f8e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
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
  logo: {
    width: 80,
    height: 32,
    objectFit: "contain",
    borderRadius: 4,
    backgroundColor: "#f5f5f5",
    padding: 4,
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
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "40px 0",
    justifyContent: "center",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24,
    marginTop: 24,
  },
  integrationCard: {
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "visible",
    "&:hover": {
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      transform: "translateY(-4px)",
    },
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: "0.875rem",
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "16px 0",
    "& li": {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      fontSize: "0.875rem",
      color: "#4b5563",
    },
  },
  statusBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  activeBadge: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  inactiveBadge: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  configButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 16px",
    width: "100%",
  },
  advancedButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 16px",
    width: "100%",
    marginTop: 8,
  },
}));

const QueueIntegration = () => {
  const classes = useStyles();
  const theme = useTheme();
  const sidebarColor = theme.palette.primary.main || "#3b82f6";

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [flowBuilderModalOpen, setFlowBuilderModalOpen] = useState(false);
  const [flowBuilderIntegrationId, setFlowBuilderIntegrationId] = useState(null);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookIntegrationId, setWebhookIntegrationId] = useState(null);
  const [asaasModalOpen, setAsaasModalOpen] = useState(false);
  const [mercadoPagoModalOpen, setMercadoPagoModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [googleIntegration, setGoogleIntegration] = useState(null);
  const [loadingGoogleIntegration, setLoadingGoogleIntegration] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [queueIntegration, dispatch] = useReducer(reducer, []);
  const { user, socket } = useContext(AuthContext);
  const [tablePage, setTablePage] = useState(0);
  const rowsPerPage = 10;

  const { getPlanCompany } = usePlans();
  const companyId = user.companyId;
  const history = useHistory();

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useIntegrations) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const fetchGoogleIntegration = async () => {
      try {
        setLoadingGoogleIntegration(true);
        const { data } = await api.get("/google-calendar/integrations");
        setGoogleIntegration(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoadingGoogleIntegration(false);
      }
    };

    const fetchPaymentSettings = async () => {
      try {
        setLoadingPaymentSettings(true);
        const { data } = await api.get("/payment-settings");
        setPaymentSettings(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoadingPaymentSettings(false);
      }
    };

    fetchGoogleIntegration();
    fetchPaymentSettings();
  }, []);

  const handleReloadPaymentSettings = () => {
    const fetchPaymentSettings = async () => {
      try {
        setLoadingPaymentSettings(true);
        const { data } = await api.get("/payment-settings");
        setPaymentSettings(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoadingPaymentSettings(false);
      }
    };
    fetchPaymentSettings();
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchIntegrations = async () => {
        try {
          const { data } = await api.get("/queueIntegration/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_INTEGRATIONS", payload: data.queueIntegrations });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchIntegrations();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const onQueueEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_INTEGRATIONS", payload: data.queueIntegration });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_INTEGRATION", payload: +data.integrationId });
      }
    };

    socket.on(`company-${companyId}-queueIntegration`, onQueueEvent);
    return () => {
      socket.off(`company-${companyId}-queueIntegration`, onQueueEvent);
    };
  }, [socket, companyId]);

  const handleOpenUserModal = () => {
    setSelectedIntegration(null);
    setUserModalOpen(true);
  };

  const handleOpenGoogleModal = () => {
    setGoogleModalOpen(true);
  };

  const handleCloseIntegrationModal = () => {
    setSelectedIntegration(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditIntegration = (queueIntegration) => {
    setSelectedIntegration(queueIntegration);
    setUserModalOpen(true);
  };

  const handleDisconnectGoogle = async () => {
    try {
      await api.delete("/google-calendar/integration");
      toast.success("Google Calendar desconectado com sucesso.");
      setGoogleIntegration([]);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteIntegration = async (integrationId) => {
    try {
      await api.delete(`/queueIntegration/${integrationId}`);
      toast.success(i18n.t("queueIntegration.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const getIntegrationLogo = (type) => {
    if (type === "dialogflow") return dialogflow;
    if (type === "n8n") return n8n;
    if (type === "webhook") return webhooks;
    if (type === "typebot") return typebot;
    if (type === "flowbuilder") return flowbuilder;
    if (type === "hostinotas") return "https://hostinotas.com.br/assets/img/logo.png";
    if (type === "asaas") return "https://www.asaas.com/images/logo-asaas.png";
    if (type === "mercadopago") return "https://img.icons8.com/color/96/000000/mercado-pago.png";
    return webhooks;
  };

  const getIntegrationInfo = (type) => {
    const integrations = {
      dialogflow: {
        color: "#FF9800",
        bgColor: "#FFF3E0",
        title: "Dialogflow",
        description: "Integre com o Dialogflow do Google para criar conversas inteligentes com IA",
        features: ["IA conversacional", "Processamento de linguagem natural", "Múltiplos idiomas"],
      },
      n8n: {
        color: "#EA4B71",
        bgColor: "#FCE4EC",
        title: "n8n",
        description: "Automatize fluxos de trabalho conectando diferentes aplicações e serviços",
        features: ["Automação de workflows", "Integração com 200+ apps", "Webhooks personalizados"],
      },
      webhook: {
        color: "#00BCD4",
        bgColor: "#E0F7FA",
        title: "Webhook",
        description: "Conecte sistemas externos via HTTP para enviar e receber dados em tempo real",
        features: ["Requisições HTTP", "Dados em tempo real", "Flexibilidade total"],
      },
      typebot: {
        color: "#7C3AED",
        bgColor: "#EDE9FE",
        title: "Typebot",
        description: "Crie chatbots conversacionais visuais sem código com interface drag-and-drop",
        features: ["Editor visual", "Sem código", "Fluxos personalizados"],
      },
      flowbuilder: {
        color: "#10B981",
        bgColor: "#D1FAE5",
        title: "Flow Builder",
        description: "Construtor de fluxos interno para criar automações de atendimento personalizadas",
        features: ["Editor de fluxos", "Condições lógicas", "Variáveis dinâmicas"],
      },
      hostinotas: {
        color: "#2563EB",
        bgColor: "#DBEAFE",
        title: "Hosti Notas",
        description: "Sistema de emissão fiscal integrado ao seu CRM",
        features: ["Emissão de NF-e", "Emissão de NFS-e", "Integração automática"],
      },
      asaas: {
        color: "#FF6B35",
        bgColor: "#FFF4ED",
        title: "Asaas",
        description: "Gateway de pagamento para boletos, pix e cartões",
        features: ["Boletos bancários", "Pagamento via PIX", "Cartão de crédito", "Carnê digital"],
      },
      mercadopago: {
        color: "#00AEEF",
        bgColor: "#E6F7FF",
        title: "Mercado Pago",
        description: "Plataforma de pagamentos da Mercado Livre",
        features: ["Pagamentos online", "PIX", "Cartões", "Link de pagamento"],
      },
    };
    return integrations[type] || integrations.webhook;
  };

  if (user.profile === "user") {
    return <ForbiddenPage />;
  }

  const paginatedItems = queueIntegration
    .filter(integration => integration.type !== "flowbuilder" && integration.type !== "webhook")
    .slice(
      tablePage * rowsPerPage,
      tablePage * rowsPerPage + rowsPerPage
    );
  const totalPages = Math.ceil(queueIntegration.length / rowsPerPage);

  return (
    <Box className={classes.root} onScroll={handleScroll} style={{ "--sidebar-color": sidebarColor }}>
      <ConfirmationModal
        title={
          deletingUser &&
          `${i18n.t("queueIntegration.confirmationModal.deleteTitle")} ${deletingUser.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteIntegration(deletingUser.id)}
      >
        {i18n.t("queueIntegration.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <IntegrationModal
        open={userModalOpen}
        onClose={handleCloseIntegrationModal}
        aria-labelledby="form-dialog-title"
        integrationId={selectedIntegration && selectedIntegration.id}
      />
      <GoogleCalendarIntegrationModal
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
      />
      <FlowBuilderModal
        open={flowBuilderModalOpen}
        integrationId={flowBuilderIntegrationId}
        onClose={() => {
          setFlowBuilderModalOpen(false);
          setFlowBuilderIntegrationId(null);
          setSearchParam("");
          setPageNumber(1);
        }}
        onSave={() => {
          setFlowBuilderModalOpen(false);
          setFlowBuilderIntegrationId(null);
          setSearchParam("");
          setPageNumber(1);
        }}
      />
      <WebhookModal
        open={webhookModalOpen}
        integrationId={webhookIntegrationId}
        onClose={() => {
          setWebhookModalOpen(false);
          setWebhookIntegrationId(null);
          setSearchParam("");
          setPageNumber(1);
        }}
        onSave={() => {
          setWebhookModalOpen(false);
          setWebhookIntegrationId(null);
          setSearchParam("");
          setPageNumber(1);
        }}
      />
      <AsaasModal
        open={asaasModalOpen}
        onClose={() => setAsaasModalOpen(false)}
        onSave={() => {
          setAsaasModalOpen(false);
          handleReloadPaymentSettings();
          setSearchParam("");
          setPageNumber(1);
        }}
      />
      <MercadoPagoModal
        open={mercadoPagoModalOpen}
        onClose={() => setMercadoPagoModalOpen(false)}
        onSave={() => {
          setMercadoPagoModalOpen(false);
          handleReloadPaymentSettings();
          setSearchParam("");
          setPageNumber(1);
        }}
      />

      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.headerLeft}>
          <Box>
            <Typography className={classes.headerTitle}>
              {i18n.t("queueIntegration.title")}
            </Typography>
            <Typography className={classes.headerSubtitle}>
              {queueIntegration.length} {queueIntegration.length === 1 ? "integração conectada" : "integrações conectadas"}
            </Typography>
          </Box>
        </Box>
        <Box className={classes.headerRight}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Pesquisar..."
            value={searchParam}
            onChange={handleSearch}
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
            onClick={handleOpenUserModal}
          >
            Adicionar
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box className={classes.content}>
        {loading && queueIntegration.length === 0 ? (
          <Box className={classes.loadingBox}>
            <CircularProgress size={32} />
            <Typography variant="body2">Carregando integrações...</Typography>
          </Box>
        ) : (
          <>
            <Box className={classes.cardsGrid}>
              {/* Card Hosti Notas - Visível apenas para companyId 1 */}
              {companyId === 1 && (() => {
                const info = getIntegrationInfo("hostinotas");
                const hasHostiNotas = queueIntegration.some(i => i.type === "hostinotas");
                return (
                  <Card className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${hasHostiNotas ? classes.activeBadge : classes.inactiveBadge}`}>
                        {hasHostiNotas ? "Ativo" : "Inativo"}
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: info.bgColor }}
                      >
                        <Box
                          style={{
                            width: 48,
                            height: 48,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 28,
                            fontWeight: 700,
                            color: info.color,
                          }}
                        >
                          📄
                        </Box>
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        {info.title}
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        {info.description}
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        {info.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckCircleIcon style={{ fontSize: 16, color: info.color }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: info.color, color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => window.open("https://hostinotas.com.br", "_blank")}
                      >
                        {hasHostiNotas ? "Configurar" : "Ativar Integração"}
                      </Button>

                      {/* Botão Conheça o Hosti Notas */}
                      <Button
                        variant="outlined"
                        className={classes.advancedButton}
                        style={{ borderColor: info.color, color: info.color }}
                        startIcon={<MoreVertIcon />}
                        onClick={() => window.open("https://notas.hostibr.com.br/planos", "_blank")}
                      >
                        Conheça o Hosti Notas
                      </Button>

                      {hasHostiNotas && (
                        <>
                          {/* Botão Configurações Avançadas */}
                          <Button
                            variant="outlined"
                            className={classes.advancedButton}
                            style={{ borderColor: info.color, color: info.color }}
                            startIcon={<MoreVertIcon />}
                            onClick={() => window.open("https://hostinotas.com.br", "_blank")}
                          >
                            Configurações Avançadas
                          </Button>
                        </>
                      )}
                    </CardActions>
                  </Card>
                );
              })()}

              {/* Card FlowBuilder - Sempre visível */}
              {(() => {
                const info = getIntegrationInfo("flowbuilder");
                const hasFlowBuilder = queueIntegration.some(i => i.type === "flowbuilder");
                return (
                  <Card className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${hasFlowBuilder ? classes.activeBadge : classes.inactiveBadge}`}>
                        {hasFlowBuilder ? "Ativo" : "Inativo"}
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: info.bgColor }}
                      >
                        <img
                          src={getIntegrationLogo("flowbuilder")}
                          alt="flowbuilder"
                          style={{ width: 48, height: 48, objectFit: "contain" }}
                        />
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        {info.title}
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        {info.description}
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        {info.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckCircleIcon style={{ fontSize: 16, color: info.color }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: info.color, color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => {
                          const flowBuilderIntegration = queueIntegration.find(i => i.type === "flowbuilder");
                          if (flowBuilderIntegration) {
                            setFlowBuilderIntegrationId(flowBuilderIntegration.id);
                          } else {
                            setFlowBuilderIntegrationId(null);
                          }
                          setFlowBuilderModalOpen(true);
                        }}
                      >
                        {hasFlowBuilder ? "Configurar" : "Ativar Integração"}
                      </Button>

                      {/* Botão Templates Avançados */}
                      <Button
                        variant="outlined"
                        className={classes.advancedButton}
                        style={{ borderColor: info.color, color: info.color }}
                        startIcon={<MoreVertIcon />}
                        onClick={() => window.open("https://hostibr.com.br/templates", "_blank")}
                      >
                        Veja templates avançados
                      </Button>

                      {hasFlowBuilder && (
                        <>
                          {/* Botão Desativar (só aparece quando ativo) */}
                          <Button
                            size="small"
                            style={{ color: "#ef4444", marginTop: 8 }}
                            startIcon={<DeleteOutlineIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              const flowBuilderIntegration = queueIntegration.find(i => i.type === "flowbuilder");
                              if (flowBuilderIntegration) {
                                setConfirmModalOpen(true);
                                setDeletingUser(flowBuilderIntegration);
                              }
                            }}
                          >
                            Desativar
                          </Button>
                        </>
                      )}
                    </CardActions>
                  </Card>
                );
              })()}

              {/* Card Webhook - Sempre visível */}
              {(() => {
                const info = getIntegrationInfo("webhook");
                const hasWebhook = queueIntegration.some(i => i.type === "webhook");
                return (
                  <Card className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${hasWebhook ? classes.activeBadge : classes.inactiveBadge}`}>
                        {hasWebhook ? "Ativo" : "Inativo"}
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: info.bgColor }}
                      >
                        <img
                          src={getIntegrationLogo("webhook")}
                          alt="webhook"
                          style={{ width: 48, height: 48, objectFit: "contain" }}
                        />
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        {info.title}
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        {info.description}
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        {info.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckCircleIcon style={{ fontSize: 16, color: info.color }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: info.color, color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => {
                          const webhookIntegration = queueIntegration.find(i => i.type === "webhook");
                          if (webhookIntegration) {
                            setWebhookIntegrationId(webhookIntegration.id);
                          } else {
                            setWebhookIntegrationId(null);
                          }
                          setWebhookModalOpen(true);
                        }}
                      >
                        {hasWebhook ? "Configurar" : "Ativar Integração"}
                      </Button>

                      {hasWebhook && (
                        <>
                          {/* Botão Desativar (só aparece quando ativo) */}
                          <Button
                            size="small"
                            style={{ color: "#ef4444", marginTop: 8 }}
                            startIcon={<DeleteOutlineIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              const webhookIntegration = queueIntegration.find(i => i.type === "webhook");
                              if (webhookIntegration) {
                                setConfirmModalOpen(true);
                                setDeletingUser(webhookIntegration);
                              }
                            }}
                          >
                            Desativar
                          </Button>
                        </>
                      )}
                    </CardActions>
                  </Card>
                );
              })()}

              {/* Card Google Calendar - Sempre visível */}
              {(() => {
                const hasGoogleCalendar = googleIntegration && googleIntegration.length > 0;
                return (
                  <Card className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${hasGoogleCalendar ? classes.activeBadge : classes.inactiveBadge}`}>
                        {hasGoogleCalendar ? "Ativo" : "Inativo"}
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: "#E3F2FD" }}
                      >
                        <Box
                          style={{
                            width: 48,
                            height: 48,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 28,
                          }}
                        >
                          📅
                        </Box>
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        Google Calendar
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        Sincronize seus agendamentos e eventos com o Google Calendar
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        <li>
                          <CheckCircleIcon style={{ fontSize: 16, color: "#1976D2" }} />
                          <span>Sincronização automática</span>
                        </li>
                        <li>
                          <CheckCircleIcon style={{ fontSize: 16, color: "#1976D2" }} />
                          <span>Agendamentos integrados</span>
                        </li>
                        <li>
                          <CheckCircleIcon style={{ fontSize: 16, color: "#1976D2" }} />
                          <span>Notificações em tempo real</span>
                        </li>
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: "#1976D2", color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => setGoogleModalOpen(true)}
                      >
                        {hasGoogleCalendar ? "Configurar" : "Ativar Integração"}
                      </Button>

                      {hasGoogleCalendar && (
                        <>
                          {/* Botão Desativar (só aparece quando ativo) */}
                          <Button
                            size="small"
                            style={{ color: "#ef4444", marginTop: 8 }}
                            startIcon={<DeleteOutlineIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnectGoogle();
                            }}
                          >
                            Desativar
                          </Button>
                        </>
                      )}
                    </CardActions>
                  </Card>
                );
              })()}

              {/* Card Asaas - Sempre visível */}
              {(() => {
                const info = getIntegrationInfo("asaas");
                const asaasConfig = paymentSettings.find(item => item.provider === "asaas");
                const hasAsaas = asaasConfig && asaasConfig.active;
                return (
                  <Card className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${hasAsaas ? classes.activeBadge : classes.inactiveBadge}`}>
                        {hasAsaas ? "Ativo" : "Inativo"}
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: info.bgColor }}
                      >
                        <img
                          src={getIntegrationLogo("asaas")}
                          alt="asaas"
                          style={{ width: 48, height: 48, objectFit: "contain" }}
                        />
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        {info.title}
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        {info.description}
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        {info.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckCircleIcon style={{ fontSize: 16, color: info.color }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: info.color, color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => setAsaasModalOpen(true)}
                      >
                        {asaasConfig ? "Configurar" : "Ativar Integração"}
                      </Button>
                    </CardActions>
                  </Card>
                );
              })()}

              {/* Card Mercado Pago - Sempre visível */}
              {(() => {
                const info = getIntegrationInfo("mercadopago");
                const mercadoPagoConfig = paymentSettings.find(item => item.provider === "mercadopago");
                const hasMercadoPago = mercadoPagoConfig && mercadoPagoConfig.active;
                return (
                  <Card className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${hasMercadoPago ? classes.activeBadge : classes.inactiveBadge}`}>
                        {hasMercadoPago ? "Ativo" : "Inativo"}
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: info.bgColor }}
                      >
                        <img
                          src={getIntegrationLogo("mercadopago")}
                          alt="mercadopago"
                          style={{ width: 48, height: 48, objectFit: "contain" }}
                        />
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        {info.title}
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        {info.description}
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        {info.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckCircleIcon style={{ fontSize: 16, color: info.color }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: info.color, color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => setMercadoPagoModalOpen(true)}
                      >
                        {mercadoPagoConfig ? "Configurar" : "Ativar Integração"}
                      </Button>
                    </CardActions>
                  </Card>
                );
              })()}

              {/* Cards de integrações existentes */}
              {paginatedItems.map((integration) => {
                const info = getIntegrationInfo(integration.type);
                return (
                  <Card key={integration.id} className={classes.integrationCard}>
                    <CardContent style={{ padding: 24, position: "relative" }}>
                      {/* Badge de Status */}
                      <Box className={`${classes.statusBadge} ${classes.activeBadge}`}>
                        Ativo
                      </Box>

                      {/* Ícone */}
                      <Box
                        className={classes.iconWrapper}
                        style={{ backgroundColor: info.bgColor }}
                      >
                        <img
                          src={getIntegrationLogo(integration.type)}
                          alt={integration.type}
                          style={{ width: 48, height: 48, objectFit: "contain" }}
                        />
                      </Box>

                      {/* Título */}
                      <Typography className={classes.cardTitle}>
                        {integration.name}
                      </Typography>

                      {/* Descrição */}
                      <Typography className={classes.cardDescription}>
                        {info.description}
                      </Typography>

                      {/* Features */}
                      <ul className={classes.featureList}>
                        {info.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckCircleIcon style={{ fontSize: 16, color: info.color }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardActions style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão Configurar */}
                      <Button
                        variant="contained"
                        className={classes.configButton}
                        style={{ backgroundColor: info.color, color: "#fff" }}
                        startIcon={<SettingsIcon />}
                        onClick={() => handleEditIntegration(integration)}
                      >
                        Configurar
                      </Button>

                      {/* Botão Configurações Avançadas ou Templates (FlowBuilder) */}
                      <Button
                        variant="outlined"
                        className={classes.advancedButton}
                        style={{ borderColor: info.color, color: info.color }}
                        startIcon={<MoreVertIcon />}
                        onClick={() => {
                          if (integration.type === "flowbuilder") {
                            window.open("https://hostibr.com.br/templates", "_blank");
                          } else {
                            handleEditIntegration(integration);
                          }
                        }}
                      >
                        {integration.type === "flowbuilder" ? "Veja templates avançados" : "Configurações Avançadas"}
                      </Button>

                      {/* Botão Excluir */}
                      <Button
                        size="small"
                        style={{ color: "#ef4444", marginTop: 8 }}
                        startIcon={<DeleteOutlineIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModalOpen(true);
                          setDeletingUser(integration);
                        }}
                      >
                        Excluir Integração
                      </Button>
                    </CardActions>
                  </Card>
                );
              })}
            </Box>

            {/* Paginação */}
            {queueIntegration.length > rowsPerPage && (
              <Box style={{ display: "flex", justifyContent: "center", marginTop: 32, gap: 8 }}>
                <Button
                  size="small"
                  disabled={tablePage === 0}
                  onClick={() => setTablePage(tablePage - 1)}
                  className={classes.actionBtn}
                >
                  Anterior
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageIdx = i;
                  if (totalPages > 5) {
                    const start = Math.max(0, Math.min(tablePage - 2, totalPages - 5));
                    pageIdx = start + i;
                  }
                  return (
                    <Button
                      key={pageIdx}
                      size="small"
                      variant={pageIdx === tablePage ? "contained" : "text"}
                      color={pageIdx === tablePage ? "primary" : "default"}
                      onClick={() => setTablePage(pageIdx)}
                      style={{
                        minWidth: 32,
                        borderRadius: 6,
                        fontWeight: pageIdx === tablePage ? 700 : 400,
                      }}
                    >
                      {pageIdx + 1}
                    </Button>
                  );
                })}
                <Button
                  size="small"
                  disabled={tablePage >= totalPages - 1}
                  onClick={() => setTablePage(tablePage + 1)}
                  className={classes.actionBtn}
                >
                  Próximo
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default QueueIntegration;