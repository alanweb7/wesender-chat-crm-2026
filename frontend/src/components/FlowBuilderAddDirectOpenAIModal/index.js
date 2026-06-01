import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogTitle, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Box, Typography, Tabs, Tab, Paper, Grid, Tooltip, IconButton, Switch, FormControlLabel, Slider } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { MdSmartToy } from "react-icons/md";
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageIcon from "@material-ui/icons/Image";
import LinkIcon from "@material-ui/icons/Link";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import LibraryBooksIcon from "@material-ui/icons/LibraryBooks";
import CompareArrowsIcon from "@material-ui/icons/CompareArrows";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import ExtensionIcon from "@material-ui/icons/Extension";
import FavoriteBorderIcon from "@material-ui/icons/FavoriteBorder";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import InsertEmoticonIcon from "@material-ui/icons/InsertEmoticon";
import ScheduleIcon from "@material-ui/icons/Schedule";
import EventNoteIcon from "@material-ui/icons/EventNote";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import EventBusyIcon from "@material-ui/icons/EventBusy";
import EditIcon from "@material-ui/icons/Edit";
import InfoIcon from "@material-ui/icons/Info";
import GroupWorkIcon from "@material-ui/icons/GroupWork";
import ForumIcon from "@material-ui/icons/Forum";
import FormatQuoteIcon from "@material-ui/icons/FormatQuote";
import CodeIcon from "@material-ui/icons/Code";
import TextFieldsIcon from "@material-ui/icons/TextFields";
import CallSplitIcon from "@material-ui/icons/CallSplit";
import PeopleOutlineIcon from "@material-ui/icons/PeopleOutline";
import BusinessIcon from "@material-ui/icons/Business";
import AssignmentIcon from "@material-ui/icons/Assignment";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import ChatIcon from "@material-ui/icons/Chat";
import api from "../../services/api";
import { getBackendUrl } from "../../config";
import toastError from "../../errors/toastError";
import { TOOL_CATALOG, DEFAULT_SENSITIVE_TOOLS } from "../../constants/aiTools";
import { TOOL_ICONS, TOOL_INSTRUCTIONS } from "./toolConfig";

// Componente Error Boundary simples
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro no modal:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open={this.props.open} onClose={this.props.close}>
          <DialogTitle>Erro</DialogTitle>
          <DialogContent>
            <Typography>Ocorreu um erro ao carregar o formulário. Tente novamente.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.props.close}>Fechar</Button>
          </DialogActions>
        </Dialog>
      );
    }

    return this.props.children;
  }
}

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paper": {
      minWidth: "700px",
      maxWidth: "900px"
    }
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: "200px"
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1)
  },
  chip: {
    margin: theme.spacing(0.25)
  },
  providerChip: {
    marginBottom: theme.spacing(2)
  },
  dialogTitle: {
    backgroundColor: "#3f51b5",
    color: "white",
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "bold",
  },
  btnWrapper: {
    position: "relative",
  },
  tabPanel: {
    padding: theme.spacing(2),
    minHeight: "400px"
  },
  tabContent: {
    marginTop: theme.spacing(2)
  },
  promptField: {
    "& .MuiOutlinedInput-root": {
      minHeight: "200px",
      direction: "ltr !important",
      textAlign: "left !important",
      unicodeBidi: "normal !important"
    },
    "& .MuiOutlinedInput-input": {
      direction: "ltr !important",
      textAlign: "left !important",
      unicodeBidi: "normal !important"
    },
    "& .MuiInputBase-inputMultiline": {
      direction: "ltr !important",
      textAlign: "left !important",
      unicodeBidi: "normal !important"
    },
    "& .MuiInputBase-input": {
      direction: "ltr !important",
      textAlign: "left !important",
      unicodeBidi: "normal !important"
    },
    "& textarea": {
      direction: "ltr !important",
      textAlign: "left !important",
      unicodeBidi: "normal !important"
    }
  },
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1.5),
  },
  toolCard: {
    padding: theme.spacing(1.5),
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    minHeight: 160,
    backgroundColor: "#fff",
  },
  toolHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
    gap: theme.spacing(1),
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    color: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
  },
  toolDescription: {
    fontSize: "0.8rem",
    color: "#4b5563",
    marginBottom: theme.spacing(1),
  },
  toolInstruction: {
    fontSize: "0.75rem",
    color: "#6b7280",
    fontStyle: "italic",
  },
  toolFooter: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }
}));

const TabPanel = ({ children, value, index, className }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
  >
    {value === index && (
      <Box className={className}>
        {children}
      </Box>
    )}
  </div>
);

const FlowBuilderAddDirectOpenAIModal = ({ open, onSave, data, close }) => {
  const classes = useStyles();
  const [activeModal, setActiveModal] = useState(false);
  const [labels, setLabels] = useState({
    title: "Configurar Agente de IA Direto",
    btn: "Salvar",
  });
  const [tabValue, setTabValue] = useState(0);
  
  const [config, setConfig] = useState({
    provider: "gemini",
    apiKey: "",
    model: "",
    prompt: "Você é um assistente de IA útil e amigável.",
    temperature: 0.7,
    maxTokens: 1000,
    maxMessages: 10,
    voice: "texto",
    voiceKey: "",
    voiceRegion: "",
    ttsModel: "tts-1",
    audioPercentage: 30,
    toolsEnabled: [],
    knowledgeBase: [],
    knowledgeBaseIds: []
  });

  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState([]);
  const imageInputRef = useRef(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "" });
  const [textForm, setTextForm] = useState({ title: "", content: "" });
  const [selectedVoice, setSelectedVoice] = useState("texto");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [ttsModel, setTtsModel] = useState("tts-1");
  const [audioPercentage, setAudioPercentage] = useState(30);

  const backendBaseUrl = useMemo(() => {
    const url = getBackendUrl();
    if (!url) return "";
    return url.replace(/\/+$/, "");
  }, []);

  const buildPublicUrl = useCallback(
    (path = "") => {
      if (!path) return "";
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }
      const sanitized = path.replace(/^\/+/, "");
      if (!backendBaseUrl) {
        return sanitized.startsWith("public/")
          ? `/${sanitized}`
          : `/public/${sanitized}`;
      }
      if (sanitized.startsWith("public/")) {
        return `${backendBaseUrl}/${sanitized}`;
      }
      return `${backendBaseUrl}/public/${sanitized}`;
    },
    [backendBaseUrl]
  );

  const resolveKnowledgeUrl = useCallback(
    (item) => {
      if (!item) return "";
      if (item.url) return buildPublicUrl(item.url);
      if (item.path) return buildPublicUrl(item.path);
      return "";
    },
    [buildPublicUrl]
  );

  const inferKnowledgeType = useCallback((item) => {
    if (item?.type) return item.type;
    if (item?.content) return "text";
    const reference = `${item?.title || ""} ${item?.url || ""} ${item?.path || ""}`.toLowerCase();
    if (/\.(png|jpe?g|gif|bmp|webp|svg)$/.test(reference)) return "image";
    if (/\.pdf$/.test(reference)) return "pdf";
    return "link";
  }, []);

  const handleCopyToClipboard = useCallback(async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado!");
    } catch (err) {
      console.error(err);
      toastError("Não foi possível copiar o link.");
    }
  }, []);

  const uploadKnowledgeFile = useCallback(async (file) => {
    if (!file) return "";
    setKnowledgeUploading(true);
    const formData = new FormData();
    formData.append("medias", file);

    try {
      const { data } = await api.post("/flowbuilder/content", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      if (Array.isArray(data)) {
        return data[0];
      }

      if (typeof data === "string") {
        return data;
      }

      return data?.url || data?.path || "";
    } catch (err) {
      console.error(err);
      toastError(err);
      return "";
    } finally {
      setKnowledgeUploading(false);
    }
  }, []);

  const handleKnowledgeFileAdd = useCallback(async (file, type, values, setFieldValue) => {
    if (!file) return;
    const storedPath = await uploadKnowledgeFile(file);

    if (!storedPath) {
      toast.error("Não foi possível enviar o arquivo.");
      return;
    }

    const resource = {
      id: `${type}-${Date.now()}-${file.name}`,
      type,
      title: file.name,
      path: storedPath,
      size: file.size,
      mimeType: file.type,
      createdAt: new Date().toISOString()
    };

    const nextKnowledge = [...(values.knowledgeBase || []), resource];
    setFieldValue("knowledgeBase", nextKnowledge);
    toast.success("Arquivo adicionado à base de conhecimento!");
  }, [uploadKnowledgeFile]);

  const handleRemoveKnowledge = useCallback((resourceIndex, values, setFieldValue) => {
    const current = values.knowledgeBase || [];
    const next = current.filter((_, index) => index !== resourceIndex);
    setFieldValue("knowledgeBase", next);
  }, []);

  const isValidUrl = useCallback((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleAddLinkResource = useCallback((values, setFieldValue) => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      toast.error("Informe o título e o link.");
      return;
    }

    if (!isValidUrl(linkForm.url.trim())) {
      toast.error("Informe um link válido (https://...).");
      return;
    }

    const resource = {
      id: `link-${Date.now()}`,
      type: "link",
      title: linkForm.title.trim(),
      url: linkForm.url.trim(),
      createdAt: new Date().toISOString()
    };

    const next = [...(values.knowledgeBase || []), resource];
    setFieldValue("knowledgeBase", next);
    setLinkForm({ title: "", url: "" });
    toast.success("Link adicionado à base de conhecimento!");
  }, [isValidUrl, linkForm]);

  const handleLinkInputChange = useCallback(
    field => event => {
      const value = event?.target?.value ?? "";
      setLinkForm(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleTextInputChange = useCallback(
    field => event => {
      const value = event?.target?.value ?? "";
      setTextForm(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleAddTextResource = useCallback((values, setFieldValue) => {
    if (!textForm.title.trim() || !textForm.content.trim()) {
      toast.error("Informe o título e o conteúdo do texto.");
      return;
    }

    const resource = {
      id: `text-${Date.now()}`,
      type: "text",
      title: textForm.title.trim(),
      content: textForm.content.trim(),
      createdAt: new Date().toISOString()
    };

    const next = [...(values.knowledgeBase || []), resource];
    setFieldValue("knowledgeBase", next);
    setTextForm({ title: "", content: "" });
    toast.success("Texto adicionado à base de conhecimento!");
  }, [textForm]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const availableTools = TOOL_CATALOG.map(tool => tool.value);

  const openaiModels = [
    { value: "gpt-4o",                label: "GPT-4o — Visão + Áudio" },
    { value: "gpt-4o-mini",           label: "GPT-4o Mini — Visão (econômico)" },
    { value: "gpt-4o-audio-preview",  label: "GPT-4o Audio Preview — Áudio" },
    { value: "gpt-4-turbo",           label: "GPT-4 Turbo — Visão" }
  ];
  const geminiModels = [
    { value: "gemini-2.5-pro",       label: "Gemini 2.5 Pro — Visão + Áudio + Vídeo",  free: false },
    { value: "gemini-2.5-flash",     label: "Gemini 2.5 Flash — Visão + Áudio + Vídeo", free: false },
    { value: "gemini-2.0-flash",     label: "Gemini 2.0 Flash — Visão + Áudio + Vídeo", free: true  },
    { value: "gemini-1.5-pro",       label: "Gemini 1.5 Pro — Visão + Áudio + Vídeo",  free: false },
    { value: "gemini-1.5-flash",     label: "Gemini 1.5 Flash — Visão + Áudio",        free: false },
    { value: "gemini-1.5-flash-8b",  label: "Gemini 1.5 Flash-8B — Visão (leve)",     free: false }
  ];
  const grokModels = [
    { value: "grok-2-vision-latest", label: "Grok 2 Vision — Visão" },
    { value: "grok-2",               label: "Grok 2 — Texto" }
  ];

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar Agente de IA Direto",
        btn: "Salvar",
      });
      const current = data?.data || {};
      try {
        // Validar e limitar o prompt para evitar problemas
        const promptValue = current.prompt || "Você é um assistente de IA útil e amigável.";
        const safePrompt = typeof promptValue === 'string' && promptValue.length <= 5000 
          ? promptValue 
          : promptValue.substring(0, 5000);
        
        setConfig({
          provider: current.provider || "gemini",
          apiKey: current.apiKey || "",
          model: current.model || "",
          prompt: safePrompt,
          temperature: current.temperature || 0.7,
          maxTokens: current.maxTokens || 1000,
          maxMessages: current.maxMessages || 10,
          voice: current.voice || "texto",
          voiceKey: current.voiceKey || "",
          voiceRegion: current.voiceRegion || "",
          ttsModel: current.ttsModel || "tts-1",
          audioPercentage: current.audioPercentage || 30,
          toolsEnabled: current.toolsEnabled || [],
          knowledgeBase: current.knowledgeBase || [],
          knowledgeBaseIds: current.knowledgeBaseIds || []
        });
        setSelectedVoice(current.voice || "texto");
        setAudioEnabled(current.voice && current.voice !== "texto");
        setTtsModel(current.ttsModel || "tts-1");
        setAudioPercentage(current.audioPercentage || 30);
      } catch (error) {
        console.error("Erro ao carregar configuração:", error);
        // Fallback para configuração padrão
        setConfig({
          provider: "gemini",
          apiKey: "",
          model: "",
          prompt: "Você é um assistente de IA útil e amigável.",
          temperature: 0.7,
          maxTokens: 1000,
          maxMessages: 10,
          voice: "texto",
          voiceKey: "",
          voiceRegion: "",
          ttsModel: "tts-1",
          audioPercentage: 30,
          toolsEnabled: [],
          knowledgeBase: [],
          knowledgeBaseIds: []
        });
      }
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Adicionar Agente de IA Direto",
        btn: "Salvar",
      });
      setConfig({
        provider: "gemini",
        apiKey: "",
        model: "gemini-2.0-flash",
        prompt: "Você é um assistente de IA útil e amigável.",
        temperature: 0.7,
        maxTokens: 1000,
        maxMessages: 10,
        voice: "texto",
        voiceKey: "",
        voiceRegion: "",
        ttsModel: "tts-1",
        audioPercentage: 30,
        toolsEnabled: [],
        knowledgeBase: [],
        knowledgeBaseIds: []
      });
      setActiveModal(true);
    }

    return () => {
      // Cleanup
    };
  }, [open, data]);

  useEffect(() => {
    api.get("/knowledge-bases").then(({ data }) => setAvailableKnowledgeBases(data)).catch(() => {});
  }, []);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const handleToolToggle = (tool) => {
    setConfig(prev => ({
      ...prev,
      toolsEnabled: prev.toolsEnabled.includes(tool)
        ? prev.toolsEnabled.filter(t => t !== tool)
        : [...prev.toolsEnabled, tool]
    }));
  };

  const handleSave = (values) => {
    handleClose();
    onSave({
      ...values,
      voice: selectedVoice,
      ttsModel: ttsModel,
      audioPercentage: audioPercentage
    });
  };

  const availableModels =
    config.provider === "gemini" ? geminiModels :
    config.provider === "grok"   ? grokModels   :
    openaiModels;

  return (
    <ErrorBoundary open={activeModal} close={handleClose}>
      <Dialog open={activeModal} onClose={handleClose} className={classes.root} maxWidth="md" fullWidth>
        <DialogTitle className={classes.dialogTitle}>
          <Box display="flex" alignItems="center" justifyContent="center">
            <MdSmartToy style={{ marginRight: 8 }} />
            {labels.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={config}
            enableReinitialize={true}
            onSubmit={(values, actions) => {
              handleSave(values);
              actions.setSubmitting(false);
            }}
          >
            {({ values, setFieldValue, submitForm }) => (
              <Form style={{ width: "100%" }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="Configurações do Agente IA" variant="scrollable" scrollButtons="auto">
                  <Tab label="1. Prompt do Sistema" />
                  <Tab label="2. Configuração IA" />
                  <Tab label="3. Ferramentas" />
                  <Tab label="4. Conhecimento" />
                  <Tab label="5. Voz" />
                </Tabs>

          {/* Aba 1: Prompt do Sistema */}
          <TabPanel value={tabValue} index={0} className={classes.tabPanel}>
            <Box className={classes.tabContent}>
              <Typography variant="h6" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <ChatIcon style={{ marginRight: 8, color: '#6366f1' }} />
                Prompt do Sistema
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Defina como a IA deve se comportar, seu tom, personalidade e limitações. Seja específico para obter melhores resultados.
              </Typography>
              <Field
                as={TextField}
                label="Prompt do Sistema"
                name="prompt"
                multiline
                rows={18}
                fullWidth
                variant="outlined"
                margin="dense"
                className={classes.formControl}
              />

              <Typography variant="h6" style={{ display: 'flex', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                <ChatIcon style={{ marginRight: 8, color: '#6366f1' }} />
                Histórico de Mensagens
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Quantidade de mensagens anteriores que a IA deve considerar no contexto da conversa.
              </Typography>
              <Field
                as={TextField}
                label="Máximo de Mensagens"
                name="maxMessages"
                type="number"
                inputProps={{ min: 1, max: 50, step: 1 }}
                fullWidth
                className={classes.formControl}
                helperText="Recomendado: 10 mensagens"
              />
            </Box>
          </TabPanel>

          {/* Aba 2: Configuração IA */}
          <TabPanel value={tabValue} index={1} className={classes.tabPanel}>
            <Box className={classes.tabContent}>
              <Typography variant="h6" style={{ marginBottom: 16 }}>
                Configuração de IA
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Escolha o provedor, modelo de IA e a chave de acesso que serão usados por este agente.
              </Typography>

              <FormControl className={classes.formControl} fullWidth>
                <InputLabel>Provider</InputLabel>
                <Field
                  as={Select}
                  name="provider"
                  label="Provider"
                >
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="gemini">Gemini</MenuItem>
                  <MenuItem value="grok">Grok (xAI)</MenuItem>
                </Field>
              </FormControl>

              <Field
                as={TextField}
                label="API Key"
                name="apiKey"
                type="password"
                fullWidth
                className={classes.formControl}
                helperText="Chave da API do provedor"
              />

              <FormControl className={classes.formControl} fullWidth>
                <InputLabel>Model</InputLabel>
                <Field
                  as={Select}
                  name="model"
                  label="Model"
                >
                  {(
                    values.provider === "gemini"
                      ? geminiModels
                      : values.provider === "grok"
                        ? grokModels
                        : openaiModels
                  ).map(model => (
                    <MenuItem key={model.value || model} value={model.value || model}>
                      {model.label || model}
                    </MenuItem>
                  ))}
                </Field>
              </FormControl>

              <Typography variant="h6" style={{ marginTop: 24, marginBottom: 16 }}>
                Parâmetros do Modelo
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Ajuste a criatividade e o tamanho das respostas do modelo de IA.
              </Typography>

              <Box display="flex" gap={2}>
                <Field
                  as={TextField}
                  label="Temperature"
                  name="temperature"
                  type="number"
                  inputProps={{ min: 0, max: 2, step: 1 }}
                  className={classes.formControl}
                  helperText="0=preciso, 1=equilibrado, 2=criativo"
                />
                <Field
                  as={TextField}
                  label="Max Tokens"
                  name="maxTokens"
                  type="number"
                  inputProps={{ min: 1, max: 4096 }}
                  className={classes.formControl}
                  helperText="Tamanho máximo da resposta"
                />
              </Box>
            </Box>
          </TabPanel>

          {/* Aba 3: Ferramentas Habilitadas */}
          <TabPanel value={tabValue} index={2} className={classes.tabPanel}>
            <Box className={classes.tabContent}>
              <Typography variant="subtitle2" gutterBottom>
                Ferramentas disponíveis para este agente
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Marque somente as ferramentas que este agente deve usar. Funções sensíveis (ex.: integrações externas ou criação de empresa) ficam desabilitadas até você ativar explicitamente.
              </Typography>
              <Box className={classes.toolGrid}>
                {TOOL_CATALOG.map(tool => {
                  const checked = (values.toolsEnabled || []).includes(tool.value);
                  const isSensitive = DEFAULT_SENSITIVE_TOOLS.includes(tool.value);
                  const Icon = TOOL_ICONS[tool.value] || MdSmartToy;
                  return (
                    <Paper key={tool.value} className={classes.toolCard} elevation={0}>
                      <div className={classes.toolHeader}>
                        <div className={classes.toolIcon}>
                          <Icon fontSize="small" />
                        </div>
                        <div>
                          <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
                            {tool.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {tool.value}
                          </Typography>
                        </div>
                        {isSensitive && (
                          <Chip
                            size="small"
                            label="Sensível"
                            style={{ marginLeft: "auto", backgroundColor: "#fee2e2", color: "#b91c1c" }}
                          />
                        )}
                      </div>
                      <Typography className={classes.toolDescription}>
                        {tool.description}
                      </Typography>
                      <Typography className={classes.toolInstruction}>
                        {TOOL_INSTRUCTIONS[tool.value] || "Instrua a IA mencionando o nome da ferramenta quando precisar usá-la."}
                      </Typography>
                      <div className={classes.toolFooter}>
                        <Typography variant="caption" color="textSecondary">
                          {checked ? "Ativa para este agente" : "Desativada"}
                        </Typography>
                        <Switch
                          color={isSensitive ? "secondary" : "primary"}
                          checked={checked}
                          onChange={(_, newValue) => {
                            const current = values.toolsEnabled || [];
                            const next = newValue
                              ? [...current, tool.value]
                              : current.filter(name => name !== tool.value);
                            setFieldValue("toolsEnabled", next);
                          }}
                        />
                      </div>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          </TabPanel>

          {/* Aba 4: Base de Conhecimento */}
          <TabPanel value={tabValue} index={3} className={classes.tabPanel}>
            <Box className={classes.tabContent}>
              <Typography variant="subtitle2" gutterBottom>
                <LibraryBooksIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Bases de Conhecimento
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Selecione as bases de conhecimento que este agente pode consultar. Nas bases vinculadas, instrua a IA no prompt sobre quando e como usá-las.
              </Typography>

              {availableKnowledgeBases.length === 0 ? (
                <Paper style={{ padding: 24, textAlign: 'center', border: '1px dashed #d1d5db', backgroundColor: '#f9fafb' }}>
                  <LibraryBooksIcon style={{ fontSize: 40, color: '#ccc', marginBottom: 8 }} />
                  <Typography variant="body2" color="textSecondary">
                    Nenhuma base de conhecimento criada ainda.
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Acesse <strong>Automação → Bases de Conhecimento</strong> para criar suas bases.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={1}>
                  {availableKnowledgeBases.map(base => {
                    const isSelected = (config.knowledgeBaseIds || []).includes(base.id);
                    return (
                      <Grid item xs={12} sm={6} key={base.id}>
                        <Paper
                          style={{
                            padding: 12,
                            border: `2px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
                            backgroundColor: isSelected ? '#eef2ff' : '#fff',
                            cursor: 'pointer',
                            borderRadius: 8
                          }}
                          onClick={() => {
                            const ids = config.knowledgeBaseIds || [];
                            setConfig(prev => ({
                              ...prev,
                              knowledgeBaseIds: isSelected
                                ? ids.filter(id => id !== base.id)
                                : [...ids, base.id]
                            }));
                          }}
                        >
                          <Box display="flex" alignItems="flex-start" style={{ gap: 10 }}>
                            <LibraryBooksIcon color={isSelected ? "primary" : "action"} fontSize="small" style={{ marginTop: 2 }} />
                            <Box flex={1}>
                              <Typography variant="subtitle2" style={{ fontWeight: 600 }}>{base.name}</Typography>
                              {base.description && (
                                <Typography variant="caption" color="textSecondary" style={{ display: 'block' }}>
                                  {base.description}
                                </Typography>
                              )}
                              <Chip
                                label={`${base.items?.length || 0} itens`}
                                size="small"
                                style={{ marginTop: 4, fontSize: 10, height: 20 }}
                                color={isSelected ? "primary" : "default"}
                              />
                            </Box>
                            {isSelected && (
                              <Chip label="Vinculada" color="primary" size="small" style={{ fontSize: 10, height: 20 }} />
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {(config.knowledgeBaseIds || []).length > 0 && (
                <Box style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f4ff', borderRadius: 8, border: '1px solid #c5d0f5' }}>
                  <Typography variant="caption" color="textSecondary">
                    <strong>Dica:</strong> No prompt deste agente, instrua a IA sobre quando consultar cada base. Exemplo: <em>"Quando o contato perguntar sobre tratamentos, consulte a base de conhecimento 'Tratamentos' para obter as informações corretas."</em>
                  </Typography>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Aba 5: Voz */}
          <TabPanel value={tabValue} index={4} className={classes.tabPanel}>
            <Box className={classes.tabContent}>
              <Typography variant="h6" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <RecordVoiceOverIcon style={{ marginRight: 8, color: '#6366f1' }} />
                Configuração de Resposta por Áudio
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                Configure como a IA responderá: texto ou áudio usando OpenAI TTS.
              </Typography>

              <Paper style={{ padding: 16, marginBottom: 16, backgroundColor: "#f8f9fa" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={audioEnabled}
                      onChange={(e) => {
                        setAudioEnabled(e.target.checked);
                        setSelectedVoice(e.target.checked ? "alloy" : "texto");
                      }}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <VolumeUpIcon style={{ marginRight: 8 }} />
                      <Typography variant="body1">
                        Habilitar resposta por áudio
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              {audioEnabled && (
                <>
                  <Paper style={{ padding: 16, marginBottom: 16, backgroundColor: "#e3f2fd", border: "1px solid #90caf9" }}>
                    <Box display="flex" alignItems="center">
                      <InfoIcon style={{ marginRight: 8, color: "#1976d2" }} />
                      <Typography variant="body2" style={{ color: "#1565c0" }}>
                        Usa a mesma API Key configurada na aba "Configuração IA"
                      </Typography>
                    </Box>
                  </Paper>

                  <FormControl variant="outlined" className={classes.formControl} margin="dense" fullWidth>
                    <InputLabel>Modelo TTS</InputLabel>
                    <Select
                      value={ttsModel}
                      onChange={(e) => setTtsModel(e.target.value)}
                      label="Modelo TTS"
                    >
                      <MenuItem value="tts-1">
                        <Box>
                          <Typography variant="body1">tts-1</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Rápido e eficiente
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="tts-1-hd">
                        <Box>
                          <Typography variant="body1">tts-1-hd</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Alta qualidade (mais lento)
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Paper style={{ padding: 16, marginBottom: 16, backgroundColor: "#fff3e0", border: "1px solid #ffb74d" }}>
                    <Typography variant="subtitle2" style={{ marginBottom: 12, fontWeight: 600, color: "#e65100" }}>
                      🎲 Probabilidade de Resposta em Áudio
                    </Typography>
                    <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                      Controle a porcentagem de respostas que serão enviadas em áudio. O restante será enviado como texto.
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" style={{ minWidth: 40, fontWeight: 600, color: "#e65100" }}>
                        {audioPercentage}%
                      </Typography>
                      <Slider
                        value={audioPercentage}
                        onChange={(e, newValue) => setAudioPercentage(newValue)}
                        min={0}
                        max={100}
                        step={5}
                        marks={[
                          { value: 0, label: '0%' },
                          { value: 25, label: '25%' },
                          { value: 50, label: '50%' },
                          { value: 75, label: '75%' },
                          { value: 100, label: '100%' }
                        ]}
                        valueLabelDisplay="auto"
                        style={{ flex: 1 }}
                      />
                    </Box>
                  </Paper>

                  <FormControl variant="outlined" className={classes.formControl} margin="dense" fullWidth>
                    <InputLabel>Voz</InputLabel>
                    <Select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      label="Voz"
                    >
                      <MenuItem value="alloy">
                        <Box>
                          <Typography variant="body1">Alloy</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Neutro e equilibrado
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="echo">
                        <Box>
                          <Typography variant="body1">Echo</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Masculino e claro
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="fable">
                        <Box>
                          <Typography variant="body1">Fable</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Britânico e expressivo
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="onyx">
                        <Box>
                          <Typography variant="body1">Onyx</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Grave e profundo
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="nova">
                        <Box>
                          <Typography variant="body1">Nova</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Feminino e energético
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="shimmer">
                        <Box>
                          <Typography variant="body1">Shimmer</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Feminino e suave
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Paper style={{ padding: 16, marginTop: 16, backgroundColor: "#f5f5f5" }}>
                    <Typography variant="subtitle2" style={{ marginBottom: 12, fontWeight: 600 }}>
                      🎧 Preview das Vozes:
                    </Typography>
                    <Grid container spacing={2}>
                      {[
                        { name: "alloy", label: "Alloy", desc: "Neutro e equilibrado", url: "https://cdn.openai.com/API/docs/audio/alloy.wav" },
                        { name: "echo", label: "Echo", desc: "Masculino e claro", url: "https://cdn.openai.com/API/docs/audio/echo.wav" },
                        { name: "fable", label: "Fable", desc: "Britânico e expressivo", url: "https://cdn.openai.com/API/docs/audio/fable.wav" },
                        { name: "onyx", label: "Onyx", desc: "Grave e profundo", url: "https://cdn.openai.com/API/docs/audio/onyx.wav" },
                        { name: "nova", label: "Nova", desc: "Feminino e energético", url: "https://cdn.openai.com/API/docs/audio/nova.wav" },
                        { name: "shimmer", label: "Shimmer", desc: "Feminino e suave", url: "https://cdn.openai.com/API/docs/audio/shimmer.wav" }
                      ].map((voice) => (
                        <Grid item xs={12} sm={6} key={voice.name}>
                          <Paper 
                            style={{ 
                              padding: 12, 
                              backgroundColor: selectedVoice === voice.name ? "#e3f2fd" : "#fff",
                              border: selectedVoice === voice.name ? "2px solid #1976d2" : "1px solid #ddd",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onClick={() => setSelectedVoice(voice.name)}
                          >
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box flex={1}>
                                <Typography variant="body1" style={{ fontWeight: 600 }}>
                                  {voice.label}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {voice.desc}
                                </Typography>
                              </Box>
                              <Tooltip title="Ouvir preview">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const audio = new Audio(voice.url);
                                    audio.play().catch(err => console.log("Erro ao reproduzir áudio:", err));
                                  }}
                                >
                                  <PlayArrowIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </>
              )}
            </Box>
          </TabPanel>
              </Form>
            )}
          </Formik>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            startIcon={<CancelIcon />}
            style={{
              color: "white",
              backgroundColor: "#db6565",
            }}
            variant="contained"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const form = document.querySelector('form');
              if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }}
            startIcon={<SaveIcon />}
            style={{
              color: "white",
              backgroundColor: "#437db5",
            }}
            variant="contained"
            className={classes.btnWrapper}
          >
            {labels.btn}
          </Button>
        </DialogActions>
      </Dialog>
    </ErrorBoundary>
  );
};

export default FlowBuilderAddDirectOpenAIModal;
