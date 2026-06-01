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
    background: "#00AEEF",
    color: "white",
    padding: theme.spacing(2),
  },
  infoBox: {
    backgroundColor: "#E6F7FF",
    border: "1px solid #91D5FF",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  infoTitle: {
    fontWeight: 600,
    color: "#00AEEF",
    marginBottom: 4,
  },
  infoText: {
    color: "#666",
    fontSize: "0.9rem",
  },
}));

const MercadoPagoModal = ({ open, onClose, onSave }) => {
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
        const mercadoPagoConfig = data.find(item => item.provider === "mercadopago");
        if (mercadoPagoConfig) {
          setConfig({
            token: mercadoPagoConfig.token || "",
            active: mercadoPagoConfig.active !== undefined ? mercadoPagoConfig.active : true,
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
      toast.error("Por favor, informe o Access Token");
      return;
    }

    try {
      setLoading(true);
      
      // Check if Mercado Pago config already exists
      const { data: existingConfigs } = await api.get("/payment-settings");
      const mercadoPagoConfig = existingConfigs.find(item => item.provider === "mercadopago");

      const payload = {
        provider: "mercadopago",
        token: config.token.trim(),
        active: config.active,
      };

      if (mercadoPagoConfig) {
        // Update existing config
        await api.put(`/payment-settings/${mercadoPagoConfig.id}`, payload);
      } else {
        // Create new config
        await api.post("/payment-settings", payload);
      }

      toast.success("Configuração do Mercado Pago salva com sucesso!");
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
        Configurar Integração Mercado Pago
      </DialogTitle>
      <DialogContent>
        <Box className={classes.infoBox}>
          <Typography className={classes.infoTitle}>
            Sobre o Mercado Pago
          </Typography>
          <Typography className={classes.infoText}>
            Configure sua integração com o Mercado Pago para processar pagamentos online. 
            Você precisará do Access Token da sua conta Mercado Pago.
          </Typography>
        </Box>

        <TextField
          label="Access Token Mercado Pago"
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

export default MercadoPagoModal;
