import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton
} from "@material-ui/core";
import { toast } from "react-toastify";
import AddPhotoAlternateIcon from "@material-ui/icons/AddPhotoAlternate";
import ClearIcon from "@material-ui/icons/Clear";

import {
  createServico,
  updateServico
} from "../../services/servicosService";

const ServiceModal = ({ open, onClose, service, onSuccess }) => {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorOriginal, setValorOriginal] = useState("");
  const [tempoAtendimento, setTempoAtendimento] = useState("");
  const [imagem, setImagem] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (service) {
      setNome(service.nome || "");
      setDescricao(service.descricao || "");
      setValorOriginal(service.valorOriginal || "");
      setTempoAtendimento(service.tempoAtendimento || "");
      setImagem(service.imagem || "");
      setImagePreview(service.imagem || "");
    } else {
      setNome("");
      setDescricao("");
      setValorOriginal("");
      setTempoAtendimento("");
      setImagem("");
      setImagePreview("");
      setImageFile(null);
    }
  }, [service]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione apenas arquivos de imagem");
        return;
      }
      
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }
      
      setImageFile(file);
      setImagem(file.name);
      
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagem("");
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do serviço");
      return;
    }

    if (!valorOriginal) {
      toast.error("Informe o valor original");
      return;
    }

    const payload = {
      nome,
      descricao,
      valorOriginal: parseFloat(valorOriginal),
      tempoAtendimento: tempoAtendimento || null,
      imagem: imagePreview || null
    };

    setSaving(true);
    try {
      if (service) {
        await updateServico(service.id, payload);
        toast.success("Serviço atualizado com sucesso!");
      } else {
        await createServico(payload);
        toast.success("Serviço criado com sucesso!");
      }
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{service ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />
        <TextField
          label="Valor original"
          type="number"
          value={valorOriginal}
          onChange={(e) => setValorOriginal(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Tempo de atendimento (minutos)"
          type="number"
          value={tempoAtendimento}
          onChange={(e) => setTempoAtendimento(e.target.value)}
          fullWidth
          margin="normal"
          helperText="Tempo estimado para realizar este serviço"
        />
        
        {/* Upload de Imagem */}
        <Box mt={2}>
          <Typography variant="subtitle1" gutterBottom>
            Imagem do Serviço
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <Button
              variant="outlined"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageFile ? 'Alterar imagem' : 'Adicionar imagem'}
            </Button>
            {imageFile && (
              <IconButton
                size="small"
                color="secondary"
                onClick={handleRemoveImage}
                title="Remover imagem"
              >
                <ClearIcon />
              </IconButton>
            )}
          </Box>
          <Typography variant="caption" color="textSecondary">
            Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
          </Typography>
        </Box>
        
        {/* Preview da Imagem */}
        {imagePreview && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Preview da imagem:
            </Typography>
            <img
              src={imagePreview}
              alt="Preview do serviço"
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "8px",
                border: "1px solid #ddd"
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button color="primary" variant="contained" onClick={handleSubmit} disabled={saving}>
          {service ? "Salvar" : "Cadastrar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceModal;
