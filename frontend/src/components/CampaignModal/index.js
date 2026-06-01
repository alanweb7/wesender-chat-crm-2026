import React, { useState, useEffect, useRef, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { head } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import { green, blue, red, orange } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Slide } from "@material-ui/core";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { isNil } from "lodash";
import { i18n } from "../../translate/i18n";
import moment from "moment";
import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  InputAdornment,
  Avatar,
  Popover,
} from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import UserStatusIcon from "../UserModal/statusIcon";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import EmojiPicker from 'emoji-picker-react';
import Draggable from 'react-draggable';
import Paper from '@material-ui/core/Paper';
import { getBackendUrl } from "../../config";

// Icons for fields
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContactsIcon from '@mui/icons-material/Contacts';
import LabelIcon from '@mui/icons-material/Label';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TicketIcon from '@mui/icons-material/ConfirmationNumber';
import QueueIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import MessageIcon from '@mui/icons-material/Message';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SmartButtonIcon from '@mui/icons-material/SmartButton';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhoneIcon from '@mui/icons-material/Phone';
import TouchAppIcon from '@mui/icons-material/TouchApp';

// Transition component
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  dialogPaper: {
    borderRadius: "8px",
    boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
    background: "#ffffff",
    minWidth: "500px",
    maxWidth: "800px",
  },
  dialogTitle: {
    backgroundColor: "#3f51b5",
    color: "white",
    padding: "16px 24px",
    borderRadius: "8px 8px 0 0",
    fontSize: "1.5rem",
    fontWeight: 600,
    cursor: "move",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start", // Alterado para alinhar à esquerda
    gap: theme.spacing(1),
  },
  dialogContent: {
    padding: "24px",
    background: "#f9fafc",
  },
  dialogActions: {
    padding: "16px 24px",
    background: "#f5f7fa",
    borderRadius: "0 0 8px 8px",
    display: "flex",
    justifyContent: "space-between",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#667eea",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#667eea",
        borderWidth: "1px",
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#667eea",
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
    },
  },
  cancelButton: {
    backgroundColor: red[500],
    color: "white",
    "&:hover": {
      backgroundColor: red[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  saveButton: {
    backgroundColor: blue[500],
    color: "white",
    "&:hover": {
      backgroundColor: blue[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  attachButton: {
    backgroundColor: green[500],
    color: "white",
    "&:hover": {
      backgroundColor: green[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  restartButton: {
    backgroundColor: orange[500],
    color: "white",
    "&:hover": {
      backgroundColor: orange[700],
    },
    borderRadius: "8px",
    padding: "8px 16px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
  },
  tabs: {
    backgroundColor: "#667eea",
    color: "white",
    borderRadius: "8px 8px 0 0",
    "& .MuiTabs-indicator": {
      backgroundColor: "white",
      height: "3px",
    },
  },
  tab: {
    color: "white",
    fontWeight: 500,
    minWidth: "auto",
    padding: "12px 16px",
    "&.Mui-selected": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },
  emojiPickerContainer: {
    padding: "10px",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    backgroundColor: "#fff",
  },
  fieldIcon: {
    color: "#667eea",
    marginRight: theme.spacing(1),
  },
  avatar: {
    backgroundColor: "#667eea",
    width: theme.spacing(4),
    height: theme.spacing(4),
  },
  statusBadge: {
    backgroundColor: green[500],
    width: 12,
    height: 12,
    borderRadius: "50%",
    position: "absolute",
    bottom: 0,
    right: 0,
    border: "2px solid white",
  },
  messageField: {
    position: "relative",
    "& .MuiInputBase-root": {
      alignItems: "flex-start",
    },
  },
  emojiButton: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 1,
  },
  phonePreviewContainer: {
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 8,
  },
  phoneFrame: {
    width: 240,
    borderRadius: 36,
    padding: "10px 6px",
    background: "#1a1a1a",
    boxShadow: "0 0 0 2px #333, 0 16px 40px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  phoneNotch: {
    width: 60,
    height: 6,
    borderRadius: 3,
    background: "#333",
    margin: "0 auto 8px auto",
  },
  phoneScreen: {
    borderRadius: 24,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: 460,
  },
  phoneHeader: {
    padding: "8px 10px",
    background: "#075e54",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
  },
  phoneHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#25d366",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  phoneHeaderTitle: {
    display: "flex",
    flexDirection: "column",
  },
  phoneHeaderSubtitle: {
    fontSize: 10,
    opacity: 0.75,
    fontWeight: 400,
  },
  phoneMessagesArea: {
    flex: 1,
    padding: "8px 8px 4px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    backgroundColor: "#e5ddd5",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bdb8' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    overflowY: "auto",
    scrollbarWidth: "none",
  },
  phoneMessageBubble: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    borderRadius: "8px 0px 8px 8px",
    padding: "5px 8px 14px",
    backgroundColor: "#dcf8c6",
    color: "#111",
    fontSize: 12,
    lineHeight: 1.4,
    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    position: "relative",
  },
  phoneMediaBubble: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    borderRadius: "8px 0px 8px 8px",
    overflow: "hidden",
    backgroundColor: "#dcf8c6",
    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
  },
  phoneFileBubble: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    borderRadius: "8px 0px 8px 8px",
    padding: "8px 10px",
    backgroundColor: "#dcf8c6",
    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    color: "#111",
  },
  phoneButtonBubble: {
    borderTop: "1px solid rgba(0,0,0,0.1)",
    padding: "6px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    color: "#00a884",
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: "#dcf8c6",
    cursor: "default",
  },
  phoneInputBar: {
    padding: "6px 8px",
    background: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  phoneInputField: {
    flex: 1,
    background: "#fff",
    borderRadius: 20,
    padding: "5px 10px",
    fontSize: 11,
    color: "#999",
    border: "none",
  },
  phonePlaceholder: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    borderRadius: "0px 8px 8px 8px",
    padding: "5px 8px",
    fontSize: 11,
    color: "#666",
    backgroundColor: "#fff",
    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
    border: "1px dashed rgba(148,163,184,0.5)",
  },
}));

const CampaignSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const DraggablePaper = (props) => {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
};

const backendUrl = getBackendUrl();

const CampaignModal = ({
  open,
  onClose,
  campaignId,
  initialValues,
  onSave,
  resetPagination,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  const { companyId } = user;

  const initialState = {
    name: "",
    message: "",
    status: "INATIVA",
    scheduledAt: "",
    contactListId: "",
    tagListId: "",
    companyId,
  };

  const [campaign, setCampaign] = useState(initialState);
  const [whatsapps, setWhatsapps] = useState([]);
  const [whatsappId, setWhatsappId] = useState(null);
  const [contactLists, setContactLists] = useState([]);
  const [tagLists, setTagLists] = useState([]);
  const [messageTab, setMessageTab] = useState(0);
  const [attachment, setAttachment] = useState(null);
  const [campaignEditable, setCampaignEditable] = useState(true);
  const attachmentFile = useRef(null);

  // Template mode
  const [useTemplate, setUseTemplate] = useState(false);
  const [templateBlocks, setTemplateBlocks] = useState([]);
  const templateFileRefs = useRef({});

  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const emojiButtonRef = useRef(null);

  const detectMediaType = (ext = "") => {
    const normalizedExt = (ext || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(normalizedExt)) {
      return "image";
    }

    if (["mp4", "webm", "ogg", "mov", "mkv"].includes(normalizedExt)) {
      return "video";
    }

    if (["mp3", "wav", "ogg", "aac", "m4a"].includes(normalizedExt)) {
      return "audio";
    }

    if (["pdf", "doc", "docx", "txt"].includes(normalizedExt)) {
      return "document";
    }

    return "file";
  };

  const getAttachmentPreview = () => {
    const buildPreview = (ext, url) => ({
      type: detectMediaType(ext),
      url: detectMediaType(ext) === "file" ? null : url,
    });

    if (attachment) {
      const name = attachment.name ? attachment.name.toLowerCase() : "";
      const ext = name.includes(".") ? name.split(".").pop() : "";
      try {
        const url = URL.createObjectURL(attachment);
        return buildPreview(ext, url);
      } catch (e) {
        return { type: "file", url: null };
      }
    }

    if (campaign.mediaPath) {
      const nameSource = (campaign.mediaName || campaign.mediaPath || "").toLowerCase();
      const ext = nameSource.includes(".") ? nameSource.split(".").pop() : "";
      const url = campaign.mediaPath.startsWith("http")
        ? campaign.mediaPath
        : `${backendUrl}/public/company${companyId}/${campaign.mediaPath}`;
      return buildPreview(ext, url);
    }

    return { type: "none", url: null };
  };

  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const emojiOpen = Boolean(emojiAnchorEl);
  const emojiId = emojiOpen ? 'emoji-popover' : undefined;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  
  useEffect(() => {
    if (isMounted.current) {
      if (initialValues) {
        setCampaign((prevState) => {
          return { ...prevState, ...initialValues };
        });
      }

      api
        .get(`/whatsapp`, { params: { companyId, session: 0 } })
        .then(({ data }) => {
          const mappedWhatsapps = data
            .filter((w) => w.channel !== "whatsapp_official")
            .map((whatsapp) => ({
              ...whatsapp,
              selected: false,
            }));
          setWhatsapps(mappedWhatsapps);
        });

      // Buscar tags comuns e kanban em paralelo
      Promise.all([
        api.get(`/tags/list`, { params: { companyId, kanban: 0 } }).catch(() => ({ data: [] })),
        api.get('/tags', { params: { kanban: 1, companyId } }).catch(() => ({ data: { tags: [] } }))
      ]).then(([{ data: commonTags }, { data: kanbanTagsData }]) => {
        const allTags = [
          ...(Array.isArray(commonTags) ? commonTags.map(tag => ({ ...tag, type: 'common' })) : []),
          ...(Array.isArray(kanbanTagsData?.tags) ? kanbanTagsData.tags.map(tag => ({ ...tag, type: 'kanban' })) : [])
        ];

        const formattedTagLists = allTags
          .filter((tag) => {
            const count = Number(tag.contactsCount) || Number(tag.ticketTags?.length) || 0;
            return count > 0 || tag.type === 'kanban';
          })
          .map((tag) => {
            const count = Number(tag.contactsCount) || Number(tag.ticketTags?.length) || 0;
            return {
              id: tag.id,
              name: `${tag.name} (${count})${tag.type === 'kanban' ? ' 📋' : ''}`,
            };
          });
        setTagLists(formattedTagLists);
      });

      // Carregar listas de contatos
      api
        .get(`/contact-lists/`, { params: { companyId } })
        .then(({ data }) => {
          const formattedContactLists = data.records ? data.records : data;
          setContactLists(formattedContactLists);
        })
        .catch((error) => {
          console.error("Error retrieving contact lists:", error);
        });

      if (!campaignId) return;

      api.get(`/campaigns/${campaignId}`).then(({ data }) => {
        if (data?.whatsappId) setWhatsappId(data.whatsappId);
        if (data?.templateData?.length) {
          setUseTemplate(true);
          setTemplateBlocks(data.templateData.map(b => ({ ...b, localFile: null, localPreviewUrl: null })));
        }
        setCampaign((prev) => {
          let prevCampaignData = Object.assign({}, prev);
          Object.entries(data).forEach(([key, value]) => {
            if (key === "scheduledAt" && value !== "" && value !== null) {
              prevCampaignData[key] = moment(value).format("YYYY-MM-DDTHH:mm");
            } else {
              prevCampaignData[key] = value === null ? "" : value;
            }
          });
          return prevCampaignData;
        });
      });
    }
  }, [campaignId, open, initialValues, companyId]);

  useEffect(() => {
    const now = moment();
    const scheduledAt = moment(campaign.scheduledAt);
    const moreThenAnHour =
      !Number.isNaN(scheduledAt.diff(now)) && scheduledAt.diff(now, "hour") > 1;
    const isEditable =
      campaign.status === "INATIVA" ||
      (campaign.status === "PROGRAMADA" && moreThenAnHour);
    setCampaignEditable(isEditable);
  }, [campaign.status, campaign.scheduledAt]);

  const handleClose = () => {
    onClose();
    setCampaign(initialState);
    setUseTemplate(false);
    setTemplateBlocks([]);
    setAttachment(null);
  };

  const handleAttachmentFile = (e) => {
    const file = head(e.target.files);
    if (file) {
      setAttachment(file);
    }
  };

  const uploadTemplateBlocks = async (id, blocks) => {
    const resolved = [];
    for (const block of blocks) {
      if (block.localFile) {
        const formData = new FormData();
        formData.append("file", block.localFile);
        const { data } = await api.post(`/campaigns/${id}/template-media`, formData);
        resolved.push({ type: block.type, mediaPath: data.mediaPath, mediaName: data.mediaName, caption: block.caption || "" });
      } else {
        const { localFile, localPreviewUrl, ...clean } = block;
        resolved.push(clean);
      }
    }
    return resolved;
  };

  const handleSaveCampaign = async (values) => {
    try {
      const dataValues = {
        ...values,
        whatsappId: whatsappId,
        channel: "whatsapp",
      };

      Object.entries(values).forEach(([key, value]) => {
        if (key === "scheduledAt" && value !== "" && value !== null) {
          dataValues[key] = moment(value).format("YYYY-MM-DD HH:mm:ss");
        } else {
          dataValues[key] = value === "" ? null : value;
        }
      });

      if (useTemplate) {
        dataValues.templateData = templateBlocks.filter(b => b.type);
      } else {
        dataValues.templateData = null;
      }

      if (campaignId) {
        if (useTemplate) {
          const resolved = await uploadTemplateBlocks(campaignId, templateBlocks);
          dataValues.templateData = resolved;
        }
        await api.put(`/campaigns/${campaignId}`, dataValues);
        if (!useTemplate && attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/campaigns/${campaignId}/media-upload`, formData);
        }
        handleClose();
      } else {
        const { data } = await api.post("/campaigns", dataValues);
        if (useTemplate) {
          const resolved = await uploadTemplateBlocks(data.id, templateBlocks);
          await api.put(`/campaigns/${data.id}`, { ...dataValues, templateData: resolved });
        } else if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/campaigns/${data.id}/media-upload`, formData);
        }
        if (onSave) {
          onSave(data);
        }
        handleClose();
      }
      toast.success(i18n.t("campaigns.toasts.success"));
    } catch (err) {
      console.log(err);
      toastError(err);
    }
  };

  
  const renderMessageField = (identifier, values, setFieldValue) => {
    const handleEmojiSelect = (emojiObject) => {
      const emoji = emojiObject.emoji;
      const currentValue = values[identifier] || "";
      setFieldValue(identifier, currentValue + emoji);
      handleEmojiClose();
    };

    return (
      <div className={classes.messageField}>
        <Field
          as={TextField}
          id={identifier}
          name={identifier}
          fullWidth
          rows={5}
          label={i18n.t(`campaigns.dialog.form.${identifier}`)}
          placeholder={i18n.t("campaigns.dialog.form.messagePlaceholder")}
          multiline={true}
          variant="outlined"
          helperText="Utilize variáveis como {nome}, {numero}, {email} ou defina variáveis personalizadas."
          disabled={!campaignEditable && campaign.status !== "CANCELADA"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MessageIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <IconButton
          ref={emojiButtonRef}
          onClick={handleEmojiClick}
          className={classes.emojiButton}
        >
          <InsertEmoticonIcon color="action" />
        </IconButton>
        <Popover
          id={emojiId}
          open={emojiOpen}
          anchorEl={emojiAnchorEl}
          onClose={handleEmojiClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <div className={classes.emojiPickerContainer}>
            <EmojiPicker 
              onEmojiClick={handleEmojiSelect}
              width={350}
              height={400}
            />
          </div>
        </Popover>
      </div>
    );
  };

  
  const cancelCampaign = async () => {
    try {
      await api.post(`/campaigns/${campaign.id}/cancel`);
      toast.success(i18n.t("campaigns.toasts.cancel"));
      setCampaign((prev) => ({ ...prev, status: "CANCELADA" }));
      resetPagination();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const restartCampaign = async () => {
    try {
      await api.post(`/campaigns/${campaign.id}/restart`);
      toast.success(i18n.t("campaigns.toasts.restart"));
      setCampaign((prev) => ({ ...prev, status: "EM_ANDAMENTO" }));
      resetPagination();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filterOptions = createFilterOptions({
    trim: true,
  });

  // ── Template builder helpers ──────────────────────────────────────────────

  const addTemplateBlock = (type) => {
    const base = { type, localFile: null, localPreviewUrl: null };
    if (type === "text") setTemplateBlocks(prev => [...prev, { ...base, text: "" }]);
    else if (type === "buttons") setTemplateBlocks(prev => [...prev, { ...base, text: "", buttons: [{ type: "cta_url", displayText: "", value: "" }] }]);
    else setTemplateBlocks(prev => [...prev, { ...base, caption: "", mediaPath: "", mediaName: "" }]);
  };

  const removeTemplateBlock = (idx) => {
    setTemplateBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTemplateBlock = (idx, updates) => {
    setTemplateBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...updates } : b));
  };

  const handleTemplateMediaSelect = (idx, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateTemplateBlock(idx, { localFile: file, localPreviewUrl: url, mediaName: file.name });
  };

  const addTemplateButton = (blockIdx) => {
    setTemplateBlocks(prev => prev.map((b, i) => {
      if (i !== blockIdx) return b;
      return { ...b, buttons: [...(b.buttons || []), { type: "cta_url", displayText: "", value: "" }] };
    }));
  };

  const removeTemplateButton = (blockIdx, btnIdx) => {
    setTemplateBlocks(prev => prev.map((b, i) => {
      if (i !== blockIdx) return b;
      return { ...b, buttons: b.buttons.filter((_, j) => j !== btnIdx) };
    }));
  };

  const updateTemplateButton = (blockIdx, btnIdx, updates) => {
    setTemplateBlocks(prev => prev.map((b, i) => {
      if (i !== blockIdx) return b;
      const newBtns = b.buttons.map((btn, j) => j === btnIdx ? { ...btn, ...updates } : btn);
      return { ...b, buttons: newBtns };
    }));
  };

  const blockTypeIcon = { text: <TextFieldsIcon fontSize="small" />, image: <ImageIcon fontSize="small" />, video: <VideoLibraryIcon fontSize="small" />, file: <InsertDriveFileIcon fontSize="small" />, buttons: <SmartButtonIcon fontSize="small" /> };
  const blockTypeLabel = { text: "Texto", image: "Imagem", video: "Vídeo", file: "Arquivo", buttons: "Botões CTA" };

  const renderTemplateBuilder = () => (
    <Box style={{ marginTop: 8 }}>
      {templateBlocks.map((block, idx) => (
        <Box key={idx} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 14px", marginBottom: 10, background: "#fff", position: "relative" }}>
          <Box display="flex" alignItems="center" style={{ marginBottom: 8, gap: 8 }}>
            {blockTypeIcon[block.type]}
            <span style={{ fontWeight: 600, fontSize: 13, color: "#3f51b5" }}>{blockTypeLabel[block.type]}</span>
            <span style={{ marginLeft: "auto" }}>
              <IconButton size="small" onClick={() => removeTemplateBlock(idx)}>
                <DeleteOutlineIcon fontSize="small" style={{ color: "#e53935" }} />
              </IconButton>
            </span>
          </Box>

          {block.type === "text" && (
            <TextField
              label="Texto"
              value={block.text || ""}
              onChange={e => updateTemplateBlock(idx, { text: e.target.value })}
              multiline rows={3} variant="outlined" fullWidth size="small"
              helperText="Use {nome}, {numero}, {email}"
              disabled={!campaignEditable}
            />
          )}

          {(block.type === "image" || block.type === "video" || block.type === "file") && (
            <Box>
              <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
                <Button size="small" variant="outlined" startIcon={<AttachFileIcon />}
                  onClick={() => {
                    if (!templateFileRefs.current[idx]) {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = block.type === "image" ? "image/*" : block.type === "video" ? "video/*" : "*/*";
                      input.onchange = e => handleTemplateMediaSelect(idx, e.target.files[0]);
                      templateFileRefs.current[idx] = input;
                    }
                    templateFileRefs.current[idx].click();
                  }}
                  disabled={!campaignEditable}
                >
                  {block.localFile || block.mediaPath ? "Trocar arquivo" : "Selecionar arquivo"}
                </Button>
                {(block.localFile || block.mediaPath) && (
                  <span style={{ fontSize: 12, color: "#555" }}>{block.localFile ? block.localFile.name : block.mediaName || block.mediaPath}</span>
                )}
              </Box>
              {block.type === "image" && block.localPreviewUrl && (
                <img src={block.localPreviewUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 6, marginBottom: 6 }} />
              )}
              {block.type === "image" && !block.localPreviewUrl && block.mediaPath && (
                <img src={`${backendUrl}/public/company${companyId}/${block.mediaPath}`} alt="preview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 6, marginBottom: 6 }} />
              )}
              <TextField
                label="Legenda (opcional)"
                value={block.caption || ""}
                onChange={e => updateTemplateBlock(idx, { caption: e.target.value })}
                variant="outlined" fullWidth size="small"
                helperText="Use {nome}, {numero}, {email}"
                disabled={!campaignEditable}
              />
            </Box>
          )}

          {block.type === "buttons" && (
            <Box>
              <TextField
                label="Corpo da mensagem"
                value={block.text || ""}
                onChange={e => updateTemplateBlock(idx, { text: e.target.value })}
                multiline rows={2} variant="outlined" fullWidth size="small" style={{ marginBottom: 10 }}
                disabled={!campaignEditable}
              />
              {(block.buttons || []).map((btn, btnIdx) => (
                <Box key={btnIdx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 140 }}>
                    <Select value={btn.type} onChange={e => updateTemplateButton(idx, btnIdx, { type: e.target.value })} disabled={!campaignEditable}>
                      <MenuItem value="quick_reply"><Box display="flex" alignItems="center" style={{ gap: 4 }}><TouchAppIcon fontSize="small" />Resposta rápida</Box></MenuItem>
                      <MenuItem value="cta_url"><Box display="flex" alignItems="center" style={{ gap: 4 }}><LinkIcon fontSize="small" />Link (URL)</Box></MenuItem>
                      <MenuItem value="cta_copy"><Box display="flex" alignItems="center" style={{ gap: 4 }}><ContentCopyIcon fontSize="small" />Copiar texto</Box></MenuItem>
                      <MenuItem value="cta_call"><Box display="flex" alignItems="center" style={{ gap: 4 }}><PhoneIcon fontSize="small" />Ligar</Box></MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" variant="outlined" label="Texto do botão" value={btn.displayText || ""} onChange={e => updateTemplateButton(idx, btnIdx, { displayText: e.target.value })} style={{ flex: 1 }} disabled={!campaignEditable} />
                  {btn.type !== "quick_reply" && (
                    <TextField size="small" variant="outlined" label={btn.type === "cta_url" ? "URL" : btn.type === "cta_call" ? "Número de telefone" : "Texto a copiar"} value={btn.value || ""} onChange={e => updateTemplateButton(idx, btnIdx, { value: e.target.value })} style={{ flex: 1 }} disabled={!campaignEditable} />
                  )}
                  <IconButton size="small" onClick={() => removeTemplateButton(idx, btnIdx)} disabled={!campaignEditable}>
                    <DeleteOutlineIcon fontSize="small" style={{ color: "#e53935" }} />
                  </IconButton>
                </Box>
              ))}
              {(block.buttons || []).length < 3 && campaignEditable && (
                <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => addTemplateButton(idx)} style={{ marginTop: 4 }}>
                  Adicionar botão
                </Button>
              )}
              {(() => {
                const btns = block.buttons || [];
                const hasQuickReply = btns.some(b => b.type === "quick_reply");
                const hasCta = btns.some(b => b.type !== "quick_reply");
                return hasQuickReply && hasCta ? (
                  <Box style={{ marginTop: 8, padding: "6px 10px", backgroundColor: "#fff3e0", borderLeft: "3px solid #f57c00", borderRadius: 4, fontSize: 12, color: "#e65100" }}>
                    ⚠️ Tipos misturados: não use <strong>Resposta rápida</strong> junto com <strong>Link, Copiar</strong> ou <strong>Ligar</strong> no mesmo bloco — o WhatsApp não suporta. Use um bloco só com "Resposta rápida" ou só com os demais tipos.
                  </Box>
                ) : null;
              })()}
            </Box>
          )}
        </Box>
      ))}

      {campaignEditable && (
        <Box display="flex" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {["text", "image", "video", "file", "buttons"].map(type => (
            <Button key={type} size="small" variant="outlined" startIcon={blockTypeIcon[type]}
              onClick={() => addTemplateBlock(type)}
              style={{ borderRadius: 20, fontSize: 11, textTransform: "none" }}
            >
              + {blockTypeLabel[type]}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        TransitionComponent={Transition}
        classes={{ paper: classes.dialogPaper }}
        PaperComponent={DraggablePaper}
        disableBackdropClick
        disableEscapeKeyDown
      >
        <DialogTitle
          id="draggable-dialog-title"
          className={classes.dialogTitle}
        >
          <CampaignIcon fontSize="large" />
          {campaignEditable ? (
            <>
              {campaignId
                ? `${i18n.t("campaigns.dialog.update")}`
                : `${i18n.t("campaigns.dialog.new")}`}
            </>
          ) : (
            <>{`${i18n.t("campaigns.dialog.readonly")}`}</>
          )}
        </DialogTitle>
        <div style={{ display: "none" }}>
          <input
            type="file"
            ref={attachmentFile}
            onChange={(e) => handleAttachmentFile(e)}
          />
        </div>
        <Formik
          initialValues={campaign}
          enableReinitialize={true}
          validationSchema={CampaignSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveCampaign(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers className={classes.dialogContent}>
                <Grid container spacing={2}>
                  {/* Coluna esquerda: formulário */}
                  <Grid item xs={12} md={8}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Field
                          as={TextField}
                          label={i18n.t("campaigns.dialog.form.name")}
                          name="name"
                          error={touched.name && Boolean(errors.name)}
                          helperText={touched.name && errors.name}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.textField}
                          disabled={!campaignEditable}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <CampaignIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.formControl}
                        >
                          <InputLabel id="contactList-selection-label">
                            {i18n.t("campaigns.dialog.form.contactList")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t(
                              "campaigns.dialog.form.contactList"
                            )}
                            placeholder={i18n.t(
                              "campaigns.dialog.form.contactList"
                            )}
                            labelId="contactList-selection-label"
                            id="contactListId"
                            name="contactListId"
                            error={
                              touched.contactListId &&
                              Boolean(errors.contactListId)
                            }
                            disabled={!campaignEditable}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <ContactsIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          >
                            <MenuItem value="">Nenhuma</MenuItem>
                            {contactLists &&
                              contactLists.map((contactList) => (
                                <MenuItem
                                  key={contactList.id}
                                  value={contactList.id}
                                >
                                  {contactList.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.formControl}
                        >
                          <InputLabel id="tagList-selection-label">
                            {i18n.t("campaigns.dialog.form.tagList")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t("campaigns.dialog.form.tagList")}
                            placeholder={i18n.t(
                              "campaigns.dialog.form.tagList"
                            )}
                            labelId="tagList-selection-label"
                            id="tagListId"
                            name="tagListId"
                            error={
                              touched.tagListId && Boolean(errors.tagListId)
                            }
                            disabled={!campaignEditable}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LabelIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          >
                            {Array.isArray(tagLists) &&
                              tagLists.map((tagList) => (
                                <MenuItem key={tagList.id} value={tagList.id}>
                                  {tagList.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </FormControl>
                      </Grid>
                                            <Grid item xs={12} md={4}>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.formControl}
                        >
                          <InputLabel id="whatsapp-selection-label">
                            {i18n.t("campaigns.dialog.form.whatsapp")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t("campaigns.dialog.form.whatsapp")}
                            placeholder={i18n.t(
                              "campaigns.dialog.form.whatsapp"
                            )}
                            labelId="whatsapp-selection-label"
                            id="whatsappIds"
                            name="whatsappIds"
                            required
                            error={
                              touched.whatsappId && Boolean(errors.whatsappId)
                            }
                            disabled={!campaignEditable}
                            value={whatsappId}
                            onChange={(event) => {
                              setWhatsappId(event.target.value);
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <WhatsAppIcon color="action" />
                                </InputAdornment>
                              ),
                            }}
                          >
                            {whatsapps &&
                              whatsapps.map((whatsapp) => (
                                <MenuItem key={whatsapp.id} value={whatsapp.id}>
                                  {whatsapp.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Field
                          as={TextField}
                          label={i18n.t("campaigns.dialog.form.scheduledAt")}
                          name="scheduledAt"
                          error={
                            touched.scheduledAt && Boolean(errors.scheduledAt)
                          }
                          helperText={
                            touched.scheduledAt && errors.scheduledAt
                          }
                          variant="outlined"
                          margin="dense"
                          type="datetime-local"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          className={classes.textField}
                          disabled={!campaignEditable}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <ScheduleIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        {/* Toggle modo clássico / template */}
                        <Box display="flex" alignItems="center" style={{ marginBottom: 10, gap: 8 }}>
                          <Button
                            size="small"
                            variant={!useTemplate ? "contained" : "outlined"}
                            onClick={() => setUseTemplate(false)}
                            style={{ borderRadius: 20, fontSize: 11, textTransform: "none" }}
                          >
                            5 Mensagens
                          </Button>
                          <Button
                            size="small"
                            variant={useTemplate ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setUseTemplate(true)}
                            style={{ borderRadius: 20, fontSize: 11, textTransform: "none" }}
                          >
                            Template
                          </Button>
                        </Box>

                        {!useTemplate && (
                          <>
                            <Tabs
                              value={messageTab}
                              indicatorColor="primary"
                              onChange={(e, v) => setMessageTab(v)}
                              variant="fullWidth"
                              centered
                              className={classes.tabs}
                            >
                              <Tab label="Msg. 1" index={0} className={classes.tab} />
                              <Tab label="Msg. 2" index={1} className={classes.tab} />
                              <Tab label="Msg. 3" index={2} className={classes.tab} />
                              <Tab label="Msg. 4" index={3} className={classes.tab} />
                              <Tab label="Msg. 5" index={4} className={classes.tab} />
                            </Tabs>
                            <Box style={{ paddingTop: 20 }}>
                              {messageTab === 0 && renderMessageField("message1", values, setFieldValue)}
                              {messageTab === 1 && renderMessageField("message2", values, setFieldValue)}
                              {messageTab === 2 && renderMessageField("message3", values, setFieldValue)}
                              {messageTab === 3 && renderMessageField("message4", values, setFieldValue)}
                              {messageTab === 4 && renderMessageField("message5", values, setFieldValue)}
                            </Box>
                            {(campaign.mediaPath || attachment) && (
                              <Box display="flex" alignItems="center" style={{ marginTop: 8 }}>
                                <AttachFileIcon color="action" style={{ marginRight: 8 }} />
                                <span>{attachment != null ? attachment.name : campaign.mediaName}</span>
                              </Box>
                            )}
                          </>
                        )}

                        {useTemplate && renderTemplateBuilder()}
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Coluna direita: preview no celular */}
                  <Grid item xs={12} md={4}>
                    <div className={classes.phonePreviewContainer}>
                      <div className={classes.phoneFrame}>
                        {/* notch */}
                        <div className={classes.phoneNotch} />
                        <div className={classes.phoneScreen}>
                          {/* Header verde WhatsApp */}
                          <div className={classes.phoneHeader}>
                            <div className={classes.phoneHeaderAvatar}>
                              <WhatsAppIcon style={{ fontSize: 16, color: "#fff" }} />
                            </div>
                            <div className={classes.phoneHeaderTitle}>
                              <span style={{ fontWeight: 600 }}>{campaign.name || "Campanha"}</span>
                              <span className={classes.phoneHeaderSubtitle}>online</span>
                            </div>
                          </div>

                          {/* Área de mensagens fundo bege */}
                          <div className={classes.phoneMessagesArea}>

                            {/* ── Template ── */}
                            {useTemplate && templateBlocks.length === 0 && (
                              <div className={classes.phonePlaceholder}>Adicione blocos ao template para visualizar.</div>
                            )}
                            {useTemplate && templateBlocks.map((block, idx) => {
                              if (block.type === "text") return (
                                <div key={idx} className={classes.phoneMessageBubble}>
                                  {block.text || <span style={{ opacity: 0.4 }}>Texto...</span>}
                                  <span style={{ position: "absolute", bottom: 3, right: 6, fontSize: 9, color: "#777", display: "flex", alignItems: "center", gap: 2 }}>
                                    12:00 ✓✓
                                  </span>
                                </div>
                              );
                              if (block.type === "image") {
                                const url = block.localPreviewUrl || (block.mediaPath ? `${backendUrl}/public/company${companyId}/${block.mediaPath}` : null);
                                return (
                                  <div key={idx} className={classes.phoneMediaBubble}>
                                    {url
                                      ? <img src={url} alt="img" style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
                                      : <div style={{ height: 80, background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon style={{ color: "#888" }} /></div>
                                    }
                                    {block.caption && <div style={{ padding: "4px 8px 12px", fontSize: 11, color: "#111", wordBreak: "break-word", position: "relative" }}>{block.caption}<span style={{ position: "absolute", bottom: 3, right: 6, fontSize: 9, color: "#777" }}>12:00 ✓✓</span></div>}
                                  </div>
                                );
                              }
                              if (block.type === "video") return (
                                <div key={idx} className={classes.phoneFileBubble}>
                                  <VideoLibraryIcon style={{ fontSize: 20, color: "#075e54" }} />
                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 600, fontSize: 11 }}>{block.localFile?.name || block.mediaName || "Vídeo"}</span>
                                    <span style={{ fontSize: 9, color: "#777" }}>Vídeo</span>
                                  </div>
                                </div>
                              );
                              if (block.type === "file") return (
                                <div key={idx} className={classes.phoneFileBubble}>
                                  <InsertDriveFileIcon style={{ fontSize: 20, color: "#075e54" }} />
                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 600, fontSize: 11 }}>{block.localFile?.name || block.mediaName || "Arquivo"}</span>
                                    <span style={{ fontSize: 9, color: "#777" }}>Documento</span>
                                  </div>
                                </div>
                              );
                              if (block.type === "buttons") return (
                                <div key={idx} style={{ alignSelf: "flex-end", maxWidth: "82%", borderRadius: "8px 0px 8px 8px", overflow: "hidden", boxShadow: "0 1px 1px rgba(0,0,0,0.13)" }}>
                                  <div style={{ backgroundColor: "#dcf8c6", padding: "5px 8px 12px", fontSize: 12, color: "#111", wordBreak: "break-word", position: "relative" }}>
                                    {block.text || <span style={{ opacity: 0.4 }}>Corpo...</span>}
                                    <span style={{ position: "absolute", bottom: 3, right: 6, fontSize: 9, color: "#777" }}>12:00 ✓✓</span>
                                  </div>
                                  {(block.buttons || []).map((btn, bi) => (
                                    <div key={bi} className={classes.phoneButtonBubble}>
                                      {btn.type === "cta_url" ? <LinkIcon style={{ fontSize: 13 }} /> : btn.type === "cta_call" ? <PhoneIcon style={{ fontSize: 13 }} /> : btn.type === "quick_reply" ? <TouchAppIcon style={{ fontSize: 13 }} /> : <ContentCopyIcon style={{ fontSize: 13 }} />}
                                      {btn.displayText || "Botão"}
                                    </div>
                                  ))}
                                </div>
                              );
                              return null;
                            })}

                            {/* ── Clássico ── */}
                            {!useTemplate && (() => {
                              const preview = getAttachmentPreview();
                              const msgText = values[`message${messageTab + 1}`];
                              return (
                                <>
                                  {preview.type === "image" && preview.url && (
                                    <div className={classes.phoneMediaBubble}>
                                      <img src={preview.url} alt="mídia" style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
                                      {msgText && <div style={{ padding: "4px 8px 12px", fontSize: 11, color: "#111", wordBreak: "break-word", position: "relative" }}>{msgText}<span style={{ position: "absolute", bottom: 3, right: 6, fontSize: 9, color: "#777" }}>12:00 ✓✓</span></div>}
                                    </div>
                                  )}
                                  {preview.type === "video" && preview.url && (
                                    <div className={classes.phoneFileBubble}>
                                      <VideoLibraryIcon style={{ fontSize: 20, color: "#075e54" }} />
                                      <span style={{ fontSize: 11 }}>{attachment?.name || campaign.mediaName}</span>
                                    </div>
                                  )}
                                  {preview.type === "audio" && preview.url && (
                                    <div className={classes.phoneFileBubble}>
                                      <span style={{ fontSize: 18 }}>🎵</span>
                                      <audio src={preview.url} controls style={{ height: 28, flex: 1 }} />
                                    </div>
                                  )}
                                  {(preview.type === "document" || preview.type === "file") && (
                                    <div className={classes.phoneFileBubble}>
                                      <InsertDriveFileIcon style={{ fontSize: 20, color: "#075e54" }} />
                                      <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontWeight: 600, fontSize: 11 }}>{attachment?.name || campaign.mediaName || "Arquivo"}</span>
                                        <span style={{ fontSize: 9, color: "#777" }}>Documento</span>
                                      </div>
                                    </div>
                                  )}
                                  {preview.type !== "image" && (
                                    msgText
                                      ? <div className={classes.phoneMessageBubble}>{msgText}<span style={{ position: "absolute", bottom: 3, right: 6, fontSize: 9, color: "#777", display: "flex", alignItems: "center", gap: 2 }}>12:00 ✓✓</span></div>
                                      : <div className={classes.phonePlaceholder}>Digite a mensagem para visualizar...</div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Barra de input inferior */}
                          <div className={classes.phoneInputBar}>
                            <div className={classes.phoneInputField}>Mensagem</div>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#075e54", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <WhatsAppIcon style={{ fontSize: 14, color: "#fff" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Grid>
                </Grid>
              </DialogContent>

              <DialogActions className={classes.dialogActions}>
                <Box>
                  {campaign.status === "CANCELADA" && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#1E90FF",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                        marginRight: 8,
                      }}
                      startIcon={<RestartAltIcon />}
                      onClick={() => restartCampaign()}
                      variant="contained"
                    >
                      {i18n.t("campaigns.dialog.buttons.restart")}
                    </Button>
                  )}
                  {campaign.status === "EM_ANDAMENTO" && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#db6565",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                        marginRight: 8,
                      }}
                      startIcon={<CancelIcon />}
                      onClick={() => cancelCampaign()}
                      variant="contained"
                    >
                      {i18n.t("campaigns.dialog.buttons.cancel")}
                    </Button>
                  )}
                  {!useTemplate && !attachment && !campaign.mediaPath && campaignEditable && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#4ec24e",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                      }}
                      startIcon={<AttachFileIcon />}
                      onClick={() => attachmentFile.current.click()}
                      disabled={isSubmitting}
                      variant="contained"
                    >
                      {i18n.t("campaigns.dialog.buttons.attach")}
                    </Button>
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    style={{
                      color: "white",
                      backgroundColor: "#db6565",
                      boxShadow: "none",
                      borderRadius: "5px",
                      fontSize: "12px",
                      marginRight: 16,
                    }}
                    startIcon={<CancelIcon />}
                    onClick={handleClose}
                    disabled={isSubmitting}
                    variant="contained"
                  >
                    {i18n.t("campaigns.dialog.buttons.close")}
                  </Button>
                  {(campaignEditable || campaign.status === "CANCELADA") && (
                    <Button
                      style={{
                        color: "white",
                        backgroundColor: "#437db5",
                        boxShadow: "none",
                        borderRadius: "5px",
                        fontSize: "12px",
                      }}
                      startIcon={<SaveIcon />}
                      type="submit"
                      disabled={isSubmitting}
                      variant="contained"
                    >
                      {campaignId
                        ? `${i18n.t("campaigns.dialog.buttons.edit")}`
                        : `${i18n.t("campaigns.dialog.buttons.add")}`}
                      {isSubmitting && (
                        <CircularProgress
                          size={24}
                          className={classes.buttonProgress}
                        />
                      )}
                    </Button>
                  )}
                </Box>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default CampaignModal;