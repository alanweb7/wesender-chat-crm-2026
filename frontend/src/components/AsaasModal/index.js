import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import CircularProgress from "@material-ui/core/CircularProgress";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
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
  dialogTitle: {
    background: "#FF6B35",
    color: "white",
    padding: theme.spacing(2),
  },
  infoBox: {
    backgroundColor: "#FFF4ED",
    border: "1px solid #FFD4B2",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  infoTitle: {
    fontWeight: 600,
    color: "#FF6B35",
    marginBottom: 4,
  },
  infoText: {
    color: "#666",
    fontSize: "0.9rem",
  },
}));

const AsaasModal = ({ open, onClose, onSave }) => {
  const classes = useStyles();
  const [config, setConfig] = useState({
    token: "",
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get("/payment-settings");
        const asaasConfig = data.find(item => item.provider === "asaas");
        if (asaasConfig) {
          setConfig({
            token: asaasConfig.token || "",
            active: asaasConfig.active !== undefined ? asaasConfig.active : true,
          });
        }
      } catch (err) {
        // Silently ignore error for now
      }
    };

    if (open) {
      fetchConfig();
    }
  }, [open]);

  const handleClose = () => {
    onClose();
    setConfig({ token: "", active: true });
    setShowToken(false);
  };

  const handleSave = async () => {
    if (!config.token.trim()) {
      toast.error("Por favor, informe o Token da API");
      return;
    }

    try {
      setLoading(true);
      
      // Check if Asaas config already exists
      const { data: existingConfigs } = await api.get("/payment-settings");
      const asaasConfig = existingConfigs.find(item => item.provider === "asaas");

      const payload = {
        provider: "asaas",
        token: config.token.trim(),
        active: config.active,
      };

      if (asaasConfig) {
        // Update existing config
        await api.put(`/payment-settings/${asaasConfig.id}`, payload);
      } else {
        // Create new config
        await api.post("/payment-settings", payload);
      }

      toast.success("Configuração do Asaas salva com sucesso!");
      if (onSave) onSave();
      handleClose();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth="md" scroll="paper">
      <DialogTitle className={classes.dialogTitle}>
        Configurar Integração Asaas
      </DialogTitle>
      <DialogContent>
        <Box className={classes.infoBox}>
          <Typography className={classes.infoTitle}>
            Sobre o Asaas
          </Typography>
          <Typography className={classes.infoText}>
            Configure sua integração com o Asaas para processar pagamentos via boletos, PIX e cartões. 
            Você precisará de um token de API da sua conta Asaas.
          </Typography>
        </Box>

        <TextField
          label="Token da API Asaas"
          type={showToken ? "text" : "password"}
          value={config.token}
          onChange={(e) => setConfig({ ...config, token: e.target.value })}
          fullWidth
          margin="dense"
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowToken(!showToken)}
                  edge="end"
                >
                  {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Box style={{ marginTop: 16 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.active}
                onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                color="primary"
              />
            }
            label="Ativar integração"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary" disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={loading}
          className={classes.btnWrapper}
        >
          Salvar Configuração
          {loading && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AsaasModal;
