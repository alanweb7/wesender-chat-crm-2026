import React, { useCallback, useContext, useEffect, useState } from "react";

import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import CancelIcon from '@mui/icons-material/Cancel';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  makeStyles,
  Paper,
} from "@material-ui/core";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import MessagesList from "../MessagesList";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";

import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";

// import html2pdf from "html2pdf.js";

const drawerWidth = 320;

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: 0,
    height: "70vh",
    minHeight: 400,
    display: "flex",
    flexDirection: "column",
  },
  messagesWrapper: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
}));

export default function TicketMessagesDialog({ open, handleClose, ticketId }) {
  const history = useHistory();
  const classes = useStyles();

  const { user, socket } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [ticket, setTicket] = useState({});

  
  const handleExportToPDF = () => {
    const messagesListElement = document.getElementById("messagesList"); // Id do elemento que você deseja exportar para PDF
    const headerElement = document.getElementById("TicketHeader"); // Id do elemento de cabeçalho que você deseja exportar


    const pdfOPtions = {
      margin: 1,
      filename: `relatório_atendimento_${ticketId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (messagesListElement) {
      toast.warn("Exportação para PDF desabilitada temporariamente");
      // const headerClone = headerElement.cloneNode(true);
      // const messagesListClone = messagesListElement.cloneNode(true);

      // const containerElement = document.createElement("div");
      // containerElement.appendChild(headerClone); // Adicione o elemento do cabeçalho
      // containerElement.appendChild(messagesListClone);
      // html2pdf()
      //   .from(containerElement)
      //   .set(pdfOPtions)
      //   .save();
    } else {
      toastError("Elemento não encontrado para exportar.");
    }
  };

  useEffect(() => {
    if (!open || !ticketId) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/tickets/${ticketId}`);
        setTicket(data);
        setContact(data.contact);
        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    };

    fetchTicket();
  }, [open, ticketId]);


  return (
    <Dialog maxWidth="lg" fullWidth onClose={handleClose} open={open}>
      <DialogTitle>
        Histórico de Conversas - Ticket #{ticketId}
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            Carregando mensagens...
          </Box>
        ) : (
          <Paper className={classes.messagesWrapper} id="messagesList">
            <div id="TicketHeader">
              <TicketHeader ticket={ticket} />
            </div>
            <ReplyMessageProvider>
              <ForwardMessageProvider>
                <MessagesList
                  ticketId={ticketId}
                  isGroup={ticket.isGroup}
                  ticket={ticket}
                />
              </ForwardMessageProvider>
            </ReplyMessageProvider>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleExportToPDF}
          color="primary"
          startIcon={<PictureAsPdfIcon />}
          variant="outlined"
        >
          Exportar PDF
        </Button>
        <Button
          startIcon={<CancelIcon />}
          onClick={handleClose}
          variant="contained"
          style={{
            color: "white",
            backgroundColor: "#1E90FF",
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
