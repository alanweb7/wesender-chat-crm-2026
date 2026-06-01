import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
} from "@material-ui/core";
import { CloudUpload as CloudUploadIcon } from "@material-ui/icons";
import api from "../../services/api";

const CompanyDocumentModal = ({ open, onClose, company, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isVisibleToCompany: false,
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    if (!formData.name) {
      toast.error("Informe o nome do documento");
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("companyId", company.id);
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("isVisibleToCompany", formData.isVisibleToCompany);

      await api.post("/company-documents", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Documento enviado com sucesso!");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      toast.error(error.response?.data?.message || "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", description: "", isVisibleToCompany: false });
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUploadIcon />
          Enviar Documento - {company?.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <TextField
            fullWidth
            label="Nome do Documento"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            variant="outlined"
            placeholder="Ex: Contrato Social, Ficha Cadastral"
          />
        </Box>
        <Box mb={2}>
          <TextField
            fullWidth
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            variant="outlined"
            multiline
            rows={3}
            placeholder="Descrição detalhada do documento (opcional)"
          />
        </Box>
        <Box mb={2}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
            style={{ display: "none" }}
            id="file-upload-modal"
          />
          <label htmlFor="file-upload-modal">
            <Button variant="outlined" component="span" fullWidth>
              {file ? file.name : "Selecionar Arquivo"}
            </Button>
          </label>
          {file && (
            <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 4 }}>
              Tamanho: {(file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          )}
        </Box>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isVisibleToCompany}
                onChange={(e) => setFormData({ ...formData, isVisibleToCompany: e.target.checked })}
              />
            }
            label="Visível para a empresa"
          />
          <Typography variant="caption" color="textSecondary" style={{ display: "block", marginLeft: 32 }}>
            Se marcado, a empresa poderá visualizar este documento
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
        >
          {uploading ? "Enviando..." : "Enviar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyDocumentModal;
