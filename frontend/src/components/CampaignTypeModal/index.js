import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  makeStyles,
  IconButton,
} from "@material-ui/core";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#075e54",
    color: "#fff",
    padding: "12px 20px",
  },
  dialogContent: {
    padding: theme.spacing(3),
    minWidth: 480,
  },
  card: {
    borderRadius: 12,
    border: "2px solid transparent",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    },
  },
  cardOfficial: {
    "&:hover": {
      borderColor: "#25d366",
    },
  },
  cardBaileys: {
    "&:hover": {
      borderColor: "#128c7e",
    },
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(3),
    textAlign: "center",
    gap: theme.spacing(1),
  },
  iconOfficial: {
    fontSize: 56,
    color: "#25d366",
    marginBottom: theme.spacing(1),
  },
  iconBaileys: {
    fontSize: 56,
    color: "#128c7e",
    marginBottom: theme.spacing(1),
  },
  badge: {
    display: "inline-block",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginBottom: theme.spacing(0.5),
  },
  badgeOfficial: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  badgeBaileys: {
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
  },
  subtitle: {
    color: theme.palette.text.secondary,
    fontSize: 13,
    lineHeight: 1.4,
  },
}));

const CampaignTypeModal = ({ open, onClose, onSelect }) => {
  const classes = useStyles();

  const handleSelect = (type) => {
    onSelect(type);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <div className={classes.dialogTitle}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          Nova Campanha — Escolha o canal
        </Typography>
        <IconButton size="small" onClick={onClose} style={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <DialogContent className={classes.dialogContent}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Card className={`${classes.card} ${classes.cardOfficial}`} elevation={2}>
              <CardActionArea onClick={() => handleSelect("whatsapp_official")}>
                <CardContent className={classes.cardContent}>
                  <WhatsAppIcon className={classes.iconOfficial} />
                  <span className={`${classes.badge} ${classes.badgeOfficial}`}>
                    API OFICIAL
                  </span>
                  <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                    WhatsApp Business API
                  </Typography>
                  <Typography className={classes.subtitle}>
                    Templates aprovados pela Meta. Alta confiabilidade e sem risco de banimento.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={6}>
            <Card className={`${classes.card} ${classes.cardBaileys}`} elevation={2}>
              <CardActionArea onClick={() => handleSelect("whatsapp")}>
                <CardContent className={classes.cardContent}>
                  <PhoneAndroidIcon className={classes.iconBaileys} />
                  <span className={`${classes.badge} ${classes.badgeBaileys}`}>
                    BAILEYS
                  </span>
                  <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                    WhatsApp Padrão
                  </Typography>
                  <Typography className={classes.subtitle}>
                    Texto livre via sessão conectada. Flexível para mensagens personalizadas.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignTypeModal;
