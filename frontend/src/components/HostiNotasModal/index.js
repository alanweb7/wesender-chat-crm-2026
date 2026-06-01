import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Switch,
  Divider,
  Paper,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import InfoIcon from "@material-ui/icons/Info";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    borderRadius: 16,
    maxWidth: 600,
  },
  dialogTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 24px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  titleText: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1f2937",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
  },
  dialogContent: {
    padding: "24px",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#374151",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    display: "flex",
    gap: 12,
  },
  textField: {
    marginBottom: 16,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
  },
  dialogActions: {
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb",
    gap: 12,
  },
  cancelButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 24px",
  },
  saveButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 24px",
    backgroundColor: "#2563EB",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#1d4ed8",
    },
  },
  learnMoreButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 24px",
    borderColor: "#2563EB",
    color: "#2563EB",
    "&:hover": {
      backgroundColor: "#EFF6FF",
      borderColor: "#1d4ed8",
    },
  },
  featuresList: {
    listStyle: "none",
    padding: 0,
    margin: "12px 0",
    "& li": {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      fontSize: "0.875rem",
      color: "#4b5563",
    },
  },
}));

const HostiNotasModal = ({ open, onClose }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState({
    apiKey: "",
  });

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/hosti-notas/config");
      if (data) {
        setConfig({
          apiKey: data.apiKey || "",
        });
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        toastError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.apiKey.trim()) {
      toast.error("Por favor, informe a API Key");
      return;
    }

    try {
      setLoading(true);
      await api.post("/hosti-notas/config", {
        apiKey: config.apiKey,
        isActive: true,
      });
      toast.success("Configuração salva com sucesso!");
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle className={classes.dialogTitle}>
        <Box className={classes.titleText}>
          <Box className={classes.iconWrapper}>📄</Box>
          <span>Configurar</span>
        </Box>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        {/* Info Box */}
        <Paper className={classes.infoBox} elevation={0}>
          <InfoIcon style={{ color: "#2563EB", fontSize: 24 }} />
          <Box>
            <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 4 }}>
              Sistema de Emissão Fiscal
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Integre com o Hosti Notas para emitir NF-e e NFS-e e através do CRM.
            </Typography>
          </Box>
        </Paper>

        {/* API Key Section */}
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle}>
            <VpnKeyIcon style={{ fontSize: 20, color: "#2563EB" }} />
            Chave de API
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            label="API Key"
            placeholder="Digite sua chave de API do Hosti Notas"
            value={config.apiKey}
            onChange={(e) => handleChange("apiKey", e.target.value)}
            type={showApiKey ? "text" : "password"}
            className={classes.textField}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                    size="small"
                  >
                    {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="textSecondary">
            Você pode obter sua API Key no painel do Hosti Notas em Configurações → API
          </Typography>
        </Box>

      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button
          onClick={onClose}
          className={classes.cancelButton}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          className={classes.saveButton}
          disabled={loading}
          variant="contained"
        >
          {loading ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HostiNotasModal;
