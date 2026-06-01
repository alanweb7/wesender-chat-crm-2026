import React, { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  makeStyles,
  IconButton,
  ButtonGroup,
} from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import { Slide } from "@material-ui/core";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LabelIcon from "@mui/icons-material/Label";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import { red, blue } from "@material-ui/core/colors";
import { toast } from "react-toastify";
import moment from "moment";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import WhatsAppPhoneMockup from "../WhatsAppPhoneMockup";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    borderRadius: 12,
    maxWidth: 900,
    width: "100%",
  },
  dialogTitle: {
    backgroundColor: "#075e54",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
  },
  titleLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dialogContent: {
    padding: theme.spacing(3),
    backgroundColor: "#f9fafc",
  },
  dialogActions: {
    padding: "12px 20px",
    backgroundColor: "#f5f7fa",
    display: "flex",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  formControl: {
    width: "100%",
  },
  noTemplateBox: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
  },
  recipientToggle: {
    width: "100%",
    marginBottom: 12,
    display: "flex",
  },
  recipientBtn: {
    flex: 1,
    fontSize: 12,
    textTransform: "none",
    padding: "6px 8px",
    borderColor: "#d0d7de",
    color: "#555",
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  recipientBtnActive: {
    backgroundColor: "#075e54 !important",
    color: "#fff !important",
    borderColor: "#075e54 !important",
  },
  cancelBtn: {
    backgroundColor: red[500],
    color: "#fff",
    "&:hover": { backgroundColor: red[700] },
    textTransform: "none",
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: blue[600],
    color: "#fff",
    "&:hover": { backgroundColor: blue[800] },
    textTransform: "none",
    borderRadius: 8,
  },
  tagBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 4,
    padding: "1px 5px",
    marginLeft: 4,
  },
  editHint: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
    marginTop: 4,
  },
}));

const extractVariables = (template) => {
  if (!template?.components) return [];
  const vars = new Set();
  for (const comp of template.components) {
    if (!comp.text) continue;
    const matches = comp.text.match(/\{\{(\d+)\}\}/g) || [];
    matches.forEach((m) => vars.add(m.replace(/\{\{|\}\}/g, "")));
  }
  return [...vars].sort((a, b) => Number(a) - Number(b));
};

// Reconstrói params {1: "val", 2: "val"} a partir de templateParams salvo + template
const reconstructParams = (template, templateParams) => {
  if (!template || !templateParams) return {};
  const vars = extractVariables(template);
  const result = {};
  for (const comp of templateParams) {
    if (!comp.parameters) continue;
    // Mapeia parâmetros em ordem para as variáveis do componente correspondente
    const templateComp = template.components.find(
      (c) => c.type.toLowerCase() === comp.type.toLowerCase()
    );
    if (!templateComp || !templateComp.text) continue;
    const compVars = (templateComp.text.match(/\{\{(\d+)\}\}/g) || []).map(
      (m) => m.replace(/\{\{|\}\}/g, "")
    );
    compVars.forEach((v, i) => {
      if (comp.parameters[i]?.text !== undefined) {
        result[v] = comp.parameters[i].text;
      }
    });
  }
  return result;
};

const CampaignOfficialModal = ({ open, onClose, onSave, campaignId }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { companyId } = user;
  const isEditing = !!campaignId;

  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [tagLists, setTagLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [name, setName] = useState("");
  const [whatsappId, setWhatsappId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [params, setParams] = useState({});

  // Destinatários
  const [recipientType, setRecipientType] = useState("list");
  const [contactListId, setContactListId] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);

  // Dados pendentes de edição (aguardando carregamento de templates/tags)
  const [pendingEdit, setPendingEdit] = useState(null);

  const variables = extractVariables(selectedTemplate);

  // Reset + carga inicial ao abrir
  useEffect(() => {
    if (!open) return;
    setName("");
    setWhatsappId("");
    setSelectedTemplate(null);
    setContactListId("");
    setSelectedTag(null);
    setRecipientType("list");
    setScheduledAt("");
    setParams({});
    setTemplates([]);
    setPendingEdit(null);

    api
      .get("/whatsapp", { params: { companyId, session: 0 } })
      .then(({ data }) =>
        setConnections(data.filter((w) => w.channel === "whatsapp_official"))
      )
      .catch(() => {});

    api
      .get("/contact-lists/", { params: { companyId } })
      .then(({ data }) =>
        setContactLists(data.records ? data.records : data)
      )
      .catch(() => {});

    api
      .get("/tags/list", { params: { companyId, kanban: 0 } })
      .then(async ({ data: commonTags }) => {
        const { data: kanbanData } = await api.get("/tags", {
          params: { kanban: 1, companyId },
        });
        const common = Array.isArray(commonTags)
          ? commonTags
              .filter((t) => t.contactsCount > 0)
              .map((t) => ({ id: t.id, name: t.name, count: t.contactsCount || 0, type: "common" }))
          : [];
        const kanban = Array.isArray(kanbanData.tags)
          ? kanbanData.tags.map((t) => ({
              id: t.id,
              name: t.name,
              count: t.ticketTags?.length || 0,
              type: "kanban",
            }))
          : [];
        setTagLists([...common, ...kanban]);
      })
      .catch(() => {});

    // Modo de edição: carregar campanha
    if (isEditing) {
      api
        .get(`/campaigns/${campaignId}`)
        .then(({ data }) => {
          setName(data.name || "");
          setScheduledAt(
            data.scheduledAt
              ? moment(data.scheduledAt).format("YYYY-MM-DDTHH:mm")
              : ""
          );
          // Destinatários
          if (data.tagListId) {
            setRecipientType("tag");
            setPendingEdit({ ...data, pendingTagType: "common" });
          } else if (data.tagKanbanId) {
            setRecipientType("tag");
            setPendingEdit({ ...data, pendingTagType: "kanban" });
          } else {
            setRecipientType("list");
            setContactListId(data.contactListId || "");
            setPendingEdit(data);
          }
          // Dispara carregamento de templates
          if (data.whatsappId) setWhatsappId(data.whatsappId);
        })
        .catch(() => toast.error("Erro ao carregar campanha"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId, companyId]);

  // Carga de templates ao mudar conexão
  useEffect(() => {
    if (!whatsappId) {
      setTemplates([]);
      setSelectedTemplate(null);
      return;
    }
    setLoadingTemplates(true);
    api
      .get(`/whatsapp-official/${whatsappId}/templates`)
      .then(({ data }) => setTemplates(data))
      .catch(() => toast.error("Erro ao carregar templates"))
      .finally(() => setLoadingTemplates(false));
  }, [whatsappId]);

  // Após templates carregarem: selecionar template salvo + reconstruir params
  useEffect(() => {
    if (!pendingEdit || templates.length === 0) return;
    const template = templates.find((t) => t.name === pendingEdit.templateName);
    if (template) {
      setSelectedTemplate(template);
      setParams(reconstructParams(template, pendingEdit.templateParams || []));
    }
  }, [templates, pendingEdit]);

  // Após tags carregarem: selecionar tag salva
  useEffect(() => {
    if (!pendingEdit || tagLists.length === 0) return;
    if (pendingEdit.pendingTagType === "common" && pendingEdit.tagListId) {
      const tag = tagLists.find(
        (t) => t.id === pendingEdit.tagListId && t.type === "common"
      );
      if (tag) setSelectedTag(tag);
    } else if (pendingEdit.pendingTagType === "kanban" && pendingEdit.tagKanbanId) {
      const tag = tagLists.find(
        (t) => t.id === pendingEdit.tagKanbanId && t.type === "kanban"
      );
      if (tag) setSelectedTag(tag);
    }
  }, [tagLists, pendingEdit]);

  const handleParamChange = (varNum, value) => {
    setParams((prev) => ({ ...prev, [varNum]: value }));
  };

  const buildTemplateParams = () => {
    if (!selectedTemplate) return [];
    const components = [];
    for (const comp of selectedTemplate.components) {
      if (!comp.text) continue;
      const matches = comp.text.match(/\{\{(\d+)\}\}/g) || [];
      if (matches.length === 0) continue;
      const parameters = matches.map((m) => {
        const n = m.replace(/\{\{|\}\}/g, "");
        return { type: "text", text: params[n] || "" };
      });
      components.push({ type: comp.type.toLowerCase(), parameters });
    }
    return components;
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Informe o nome da campanha");
    if (!whatsappId) return toast.error("Selecione uma conexão");
    if (!selectedTemplate) return toast.error("Selecione um template");
    if (recipientType === "list" && !contactListId)
      return toast.error("Selecione uma lista de contatos");
    if (recipientType === "tag" && !selectedTag)
      return toast.error("Selecione uma etiqueta");

    setSaving(true);
    try {
      const payload = {
        name,
        whatsappId,
        channel: "whatsapp_official",
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
        templateParams: buildTemplateParams(),
        status: scheduledAt ? "PROGRAMADA" : "INATIVA",
        scheduledAt: scheduledAt
          ? moment(scheduledAt).format("YYYY-MM-DD HH:mm:ss")
          : null,
        companyId,
      };

      if (recipientType === "list") {
        payload.contactListId = contactListId;
      } else if (selectedTag?.type === "kanban") {
        payload.tagKanbanId = selectedTag.id;
      } else {
        payload.tagListId = selectedTag.id;
      }

      if (isEditing) {
        await api.put(`/campaigns/${campaignId}`, payload);
        toast.success("Campanha atualizada com sucesso");
      } else {
        const { data } = await api.post("/campaigns", payload);
        if (onSave) onSave(data);
      }
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: classes.dialogPaper }}
    >
      <div className={classes.dialogTitle}>
        <div className={classes.titleLeft}>
          <WhatsAppIcon />
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            {isEditing ? "Editar Campanha — API Oficial" : "Nova Campanha — API Oficial"}
          </Typography>
        </div>
        <IconButton size="small" onClick={onClose} style={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <DialogContent className={classes.dialogContent}>
        <Grid container spacing={3}>
          {/* Coluna de configuração */}
          <Grid item xs={12} sm={7}>
            <Typography className={classes.sectionLabel}>
              Dados da Campanha
            </Typography>

            <TextField
              label="Nome da campanha"
              variant="outlined"
              size="small"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            <FormControl
              variant="outlined"
              size="small"
              fullWidth
              className={classes.formControl}
              style={{ marginBottom: 16 }}
            >
              <InputLabel>Conexão (API Oficial)</InputLabel>
              <Select
                value={whatsappId}
                onChange={(e) => {
                  setWhatsappId(e.target.value);
                  if (!isEditing) setSelectedTemplate(null);
                }}
                label="Conexão (API Oficial)"
              >
                {connections.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography className={classes.sectionLabel}>Template</Typography>

            {!whatsappId ? (
              <Typography style={{ fontSize: 13, color: "#999" }}>
                Selecione uma conexão para carregar os templates
              </Typography>
            ) : loadingTemplates ? (
              <CircularProgress size={20} />
            ) : templates.length === 0 ? (
              <div className={classes.noTemplateBox}>
                <Typography style={{ fontSize: 13 }}>
                  Nenhum template aprovado encontrado para esta conexão.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  href="https://business.facebook.com/wa/manage/message-templates/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Criar template
                </Button>
              </div>
            ) : (
              <Autocomplete
                options={templates}
                getOptionLabel={(t) => t.name}
                value={selectedTemplate}
                onChange={(_, val) => {
                  setSelectedTemplate(val);
                  setParams({});
                }}
                renderOption={(t) => (
                  <div>
                    <Typography style={{ fontSize: 13, fontWeight: 600 }}>
                      {t.name}
                    </Typography>
                    <Typography style={{ fontSize: 11, color: "#888" }}>
                      {t.language} · {t.category}
                    </Typography>
                  </div>
                )}
                renderInput={(inputParams) => (
                  <TextField
                    {...inputParams}
                    label="Selecionar template"
                    variant="outlined"
                    size="small"
                  />
                )}
              />
            )}

            {/* Variáveis do template */}
            {variables.length > 0 && (
              <>
                <Typography
                  className={classes.sectionLabel}
                  style={{ marginTop: 16 }}
                >
                  Variáveis do template
                </Typography>
                {isEditing && (
                  <Typography className={classes.editHint}>
                    Edite os valores abaixo. Não é necessário reenviar para aprovação da Meta.
                  </Typography>
                )}
                {variables.map((v) => (
                  <TextField
                    key={v}
                    label={`Variável {{${v}}}`}
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={params[v] || ""}
                    onChange={(e) => handleParamChange(v, e.target.value)}
                    style={{ marginBottom: 10, marginTop: 8 }}
                    placeholder={`Texto para {{${v}}}`}
                  />
                ))}
              </>
            )}

            <Divider style={{ margin: "16px 0" }} />

            <Typography className={classes.sectionLabel}>
              Destinatários e Agendamento
            </Typography>

            {/* Toggle de tipo de destinatário */}
            <ButtonGroup size="small" className={classes.recipientToggle}>
              <Button
                className={`${classes.recipientBtn} ${
                  recipientType === "list" ? classes.recipientBtnActive : ""
                }`}
                onClick={() => {
                  setRecipientType("list");
                  setContactListId("");
                  setSelectedTag(null);
                }}
              >
                <ListAltIcon style={{ fontSize: 16 }} />
                Lista de Contatos
              </Button>
              <Button
                className={`${classes.recipientBtn} ${
                  recipientType === "tag" ? classes.recipientBtnActive : ""
                }`}
                onClick={() => {
                  setRecipientType("tag");
                  setContactListId("");
                  setSelectedTag(null);
                }}
              >
                <LabelIcon style={{ fontSize: 16 }} />
                Etiqueta / Tag
              </Button>
            </ButtonGroup>

            {recipientType === "list" ? (
              <FormControl
                variant="outlined"
                size="small"
                fullWidth
                style={{ marginBottom: 16 }}
              >
                <InputLabel>Lista de contatos</InputLabel>
                <Select
                  value={contactListId}
                  onChange={(e) => setContactListId(e.target.value)}
                  label="Lista de contatos"
                >
                  {contactLists.map((list) => (
                    <MenuItem key={list.id} value={list.id}>
                      {list.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Autocomplete
                options={tagLists}
                getOptionLabel={(t) => t.name}
                value={selectedTag}
                onChange={(_, val) => setSelectedTag(val)}
                style={{ marginBottom: 16 }}
                renderOption={(t) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {t.type === "kanban" ? (
                      <ViewKanbanIcon style={{ fontSize: 16, color: "#7c3aed" }} />
                    ) : (
                      <LabelIcon style={{ fontSize: 16, color: "#0369a1" }} />
                    )}
                    <span style={{ fontSize: 13 }}>{t.name}</span>
                    <span
                      className={classes.tagBadge}
                      style={{
                        backgroundColor:
                          t.type === "kanban" ? "#ede9fe" : "#e0f2fe",
                        color: t.type === "kanban" ? "#7c3aed" : "#0369a1",
                      }}
                    >
                      {t.type === "kanban" ? "Kanban" : "Tag"} · {t.count}
                    </span>
                  </div>
                )}
                renderInput={(inputParams) => (
                  <TextField
                    {...inputParams}
                    label="Selecionar etiqueta"
                    variant="outlined"
                    size="small"
                    placeholder="Buscar tag ou tag kanban..."
                  />
                )}
              />
            )}

            <TextField
              label="Agendamento (opcional)"
              type="datetime-local"
              variant="outlined"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Grid>

          {/* Coluna do preview */}
          <Grid item xs={12} sm={5}>
            <Typography className={classes.sectionLabel}>
              Preview do template
            </Typography>
            <WhatsAppPhoneMockup template={selectedTemplate} params={params} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button
          onClick={onClose}
          className={classes.cancelBtn}
          startIcon={<CancelIcon />}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          className={classes.saveBtn}
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={saving}
        >
          {isEditing ? "Salvar Alterações" : "Criar Campanha"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignOfficialModal;
