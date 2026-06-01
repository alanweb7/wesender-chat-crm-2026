import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box
} from "@material-ui/core";
import {
  Close as CloseIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Headset as AudioIcon,
  Description as DocumentIcon,
  Link as LinkIcon,
  FileCopy as CopyIcon
} from "@material-ui/icons";

const QuickMessagePreviewModal = ({ open, onClose, quickMessage, onSend }) => {
  if (!quickMessage) return null;

  const renderMediaPreview = () => {
    if (!quickMessage.mediaPath) return null;

    const mediaType = quickMessage.mediaType || 'document';

    switch (mediaType) {
      case 'image':
        return (
          <Box mt={2} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            <img 
              src={quickMessage.mediaPath} 
              alt="Preview" 
              style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }}
            />
          </Box>
        );

      case 'video':
        return (
          <Box mt={2} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            <video 
              controls 
              style={{ width: '100%', maxHeight: '400px', display: 'block' }}
            >
              <source src={quickMessage.mediaPath} />
              Seu navegador não suporta vídeo.
            </video>
          </Box>
        );

      case 'audio':
        return (
          <Box mt={2} p={2} style={{ borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f5f5f5' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <AudioIcon style={{ fontSize: 32, marginRight: 12, color: '#5b68ea' }} />
              <Typography variant="body1" style={{ fontWeight: 600 }}>
                {quickMessage.mediaName || 'Áudio'}
              </Typography>
            </Box>
            <audio 
              controls 
              style={{ width: '100%' }}
            >
              <source src={quickMessage.mediaPath} />
              Seu navegador não suporta áudio.
            </audio>
          </Box>
        );

      case 'document':
        return (
          <Box mt={2} p={2} display="flex" alignItems="center" style={{ borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f5f5f5' }}>
            <DocumentIcon style={{ fontSize: 48, marginRight: 16, color: '#5b68ea' }} />
            <Box>
              <Typography variant="body1" style={{ fontWeight: 600 }}>
                {quickMessage.mediaName || 'Documento'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Documento anexado
              </Typography>
            </Box>
          </Box>
        );

      default:
        return (
          <Box mt={2} p={2} display="flex" alignItems="center" style={{ borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f5f5f5' }}>
            <DocumentIcon style={{ fontSize: 48, marginRight: 16, color: '#666' }} />
            <Box>
              <Typography variant="body1" style={{ fontWeight: 600 }}>
                {quickMessage.mediaName || 'Arquivo'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Arquivo anexado
              </Typography>
            </Box>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle style={{ backgroundColor: "#5b68ea", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px" }}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          Preview - {quickMessage.shortcode}
        </Typography>
        <IconButton onClick={onClose} style={{ color: "#fff", padding: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: "24px" }}>
        {/* Texto da mensagem */}
        {quickMessage.message && (
          <Box mb={2}>
            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#666", marginBottom: 8 }}>
              Mensagem:
            </Typography>
            <Box 
              p={2} 
              style={{ 
                backgroundColor: '#f0f2f5', 
                borderRadius: '8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              <Typography variant="body1">
                {quickMessage.message}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Preview de botões CTA */}
        {quickMessage.messageType === "buttons" && quickMessage.buttons?.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#666", marginBottom: 8 }}>
              Botões interativos:
            </Typography>
            {quickMessage.buttons.map((btn, idx) => (
              <Box
                key={idx}
                display="flex"
                alignItems="center"
                mb={1}
                p={1.5}
                style={{
                  border: "1px solid #5b68ea",
                  borderRadius: 8,
                  background: "#f0f2ff",
                  gap: 8
                }}
              >
                {btn.type === "cta_url" ? (
                  <LinkIcon style={{ color: "#5b68ea", fontSize: 20 }} />
                ) : (
                  <CopyIcon style={{ color: "#5b68ea", fontSize: 20 }} />
                )}
                <Box flex={1}>
                  <Typography variant="body2" style={{ fontWeight: 600, color: "#5b68ea" }}>
                    {btn.displayText}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {btn.type === "cta_url" ? "Abrir link: " : "Copiar: "}{btn.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Preview do arquivo */}
        {quickMessage.messageType !== "buttons" && quickMessage.mediaPath && (
          <Box>
            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#666", marginBottom: 8 }}>
              Arquivo anexado:
            </Typography>
            {renderMediaPreview()}
          </Box>
        )}

        {!quickMessage.message && !quickMessage.mediaPath && quickMessage.messageType !== "buttons" && (
          <Box p={4} textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Nenhum conteúdo disponível
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions style={{ padding: "16px 24px", borderTop: "1px solid #e0e0e0" }}>
        <Button 
          onClick={onClose}
          style={{ color: "#666" }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={() => {
            console.log("🚀 Botão ENVIAR clicado no modal!");
            console.log("📤 quickMessage sendo enviado:", quickMessage);
            console.log("📎 mediaPath:", quickMessage?.mediaPath);
            console.log("🎯 onSend function:", onSend);
            onSend(quickMessage);
            onClose();
          }}
          variant="contained"
          style={{ 
            backgroundColor: "#5b68ea", 
            color: "#fff",
            fontWeight: 600
          }}
        >
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickMessagePreviewModal;
