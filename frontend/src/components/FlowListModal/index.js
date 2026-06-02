import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
  makeStyles,
  Box,
} from "@material-ui/core";
import PlayCircleFilledIcon from "@material-ui/icons/PlayCircleFilled";
import CloseIcon from "@material-ui/icons/Close";
import AccountTreeIcon from "@material-ui/icons/AccountTree";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles(() => ({
  dialog: {
    "& .MuiDialog-paper": {
      backgroundColor: "#1f2c33",
      borderRadius: "12px",
      minWidth: 340,
      maxWidth: 480,
      width: "100%",
    },
  },
  dialogTitle: {
    backgroundColor: "#1f2c33",
    color: "#e9edef",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #2a3942",
    "& .MuiTypography-root": {
      color: "#e9edef",
      fontSize: "16px",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
  },
  closeButton: {
    color: "#8696a0",
    padding: 4,
    "&:hover": {
      backgroundColor: "rgba(134, 150, 160, 0.1)",
    },
  },
  dialogContent: {
    padding: 0,
    backgroundColor: "#1f2c33",
  },
  list: {
    padding: "8px 0",
  },
  listItem: {
    padding: "12px 20px",
    borderBottom: "1px solid #2a3942",
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      backgroundColor: "#2a3942",
    },
  },
  flowName: {
    color: "#e9edef",
    fontSize: "14px",
    fontWeight: 400,
  },
  dispatchButton: {
    color: "#25d366",
    "&:hover": {
      backgroundColor: "rgba(37, 211, 102, 0.1)",
    },
    "&:disabled": {
      color: "#4a5a62",
    },
  },
  emptyState: {
    padding: "32px 20px",
    textAlign: "center",
    color: "#8696a0",
  },
  loadingState: {
    padding: "32px 20px",
    display: "flex",
    justifyContent: "center",
  },
}));

const FlowListModal = ({ open, onClose, ticketId }) => {
  const classes = useStyles();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(null);

  useEffect(() => {
    if (!open) return;
    const loadFlows = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/flowbuilder");
        setFlows(data?.flows || data || []);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    loadFlows();
  }, [open]);

  const handleDispatch = async (flow) => {
    if (!ticketId) {
      toast.error("Nenhum ticket selecionado");
      return;
    }
    try {
      setDispatching(flow.id);
      await api.post("/flowbuilder/dispatch", {
        flowId: flow.id,
        ticketId,
      });
      toast.success(`Fluxo "${flow.name}" disparado com sucesso!`);
      onClose(true);
    } catch (err) {
      toastError(err);
    } finally {
      setDispatching(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={classes.dialog}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle className={classes.dialogTitle} disableTypography>
        <Typography variant="h6">
          <AccountTreeIcon style={{ fontSize: 20, color: "#009de2" }} />
          Lista de Fluxos
        </Typography>
        <IconButton
          className={classes.closeButton}
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        {loading ? (
          <Box className={classes.loadingState}>
            <CircularProgress size={32} style={{ color: "#009de2" }} />
          </Box>
        ) : flows.length === 0 ? (
          <Box className={classes.emptyState}>
            <Typography variant="body2">
              Nenhum fluxo encontrado. Crie fluxos em <strong>/fluxos</strong>.
            </Typography>
          </Box>
        ) : (
          <List className={classes.list}>
            {flows.map((flow) => (
              <ListItem key={flow.id} className={classes.listItem}>
                <ListItemText
                  primary={flow.name}
                  classes={{ primary: classes.flowName }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    className={classes.dispatchButton}
                    edge="end"
                    onClick={() => handleDispatch(flow)}
                    disabled={dispatching === flow.id}
                    title={`Disparar fluxo "${flow.name}"`}
                    size="small"
                  >
                    {dispatching === flow.id ? (
                      <CircularProgress size={20} style={{ color: "#25d366" }} />
                    ) : (
                      <PlayCircleFilledIcon style={{ fontSize: 28 }} />
                    )}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FlowListModal;
