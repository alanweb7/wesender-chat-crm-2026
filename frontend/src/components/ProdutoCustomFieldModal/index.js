import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Typography,
  Box
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  dialogField: {
    marginBottom: theme.spacing(2)
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  }
}));

const TIPOS_CAMPO = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "boolean", label: "Sim/Não" },
  { value: "select", label: "Lista de Opções" }
];

const ProdutoCustomFieldModal = ({ open, onClose, fieldEdit, onSuccess }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    chave: "",
    tipo: "texto",
    opcoes: [],
    obrigatorio: false,
    ordem: 0
  });

  const [novaOpcao, setNovaOpcao] = useState("");

  useEffect(() => {
    if (open) {
      if (fieldEdit) {
        setFormData({
          nome: fieldEdit.nome || "",
          chave: fieldEdit.chave || "",
          tipo: fieldEdit.tipo || "texto",
          opcoes: fieldEdit.opcoes || [],
          obrigatorio: fieldEdit.obrigatorio || false,
          ordem: fieldEdit.ordem || 0
        });
      } else {
        setFormData({
          nome: "",
          chave: "",
          tipo: "texto",
          opcoes: [],
          obrigatorio: false,
          ordem: 0
        });
      }
      setNovaOpcao("");
    }
  }, [open, fieldEdit]);

  const handleChange = (field) => (event) => {
    const value = field === "obrigatorio" ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddOpcao = () => {
    if (novaOpcao.trim()) {
      setFormData(prev => ({
        ...prev,
        opcoes: [...prev.opcoes, novaOpcao.trim()]
      }));
      setNovaOpcao("");
    }
  };

  const handleRemoveOpcao = (index) => {
    setFormData(prev => ({
      ...prev,
      opcoes: prev.opcoes.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome do campo é obrigatório");
      return;
    }

    if (!formData.chave.trim()) {
      toast.error("Chave do campo é obrigatória");
      return;
    }

    if (formData.tipo === "select" && formData.opcoes.length === 0) {
      toast.error("Adicione pelo menos uma opção para o tipo Lista de Opções");
      return;
    }

    setLoading(true);

    try {
      if (fieldEdit) {
        await api.put(`/produto-custom-fields/${fieldEdit.id}`, formData);
        toast.success("Campo atualizado com sucesso!");
      } else {
        await api.post("/produto-custom-fields", formData);
        toast.success("Campo criado com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Erro ao salvar campo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {fieldEdit ? "Editar Campo Personalizado" : "Novo Campo Personalizado"}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.nome}
                onChange={handleChange("nome")}
                variant="outlined"
                required
                className={classes.dialogField}
                placeholder="Ex: Produção"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chave (identificador)"
                value={formData.chave}
                onChange={handleChange("chave")}
                variant="outlined"
                required
                className={classes.dialogField}
                placeholder="Ex: producao"
                helperText="Usado internamente, sem espaços ou caracteres especiais"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" className={classes.dialogField}>
                <InputLabel>Tipo de Campo</InputLabel>
                <Select
                  value={formData.tipo}
                  onChange={handleChange("tipo")}
                  label="Tipo de Campo"
                >
                  {TIPOS_CAMPO.map(tipo => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {formData.tipo === "select" && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Opções
                </Typography>
                <Box className={classes.optionRow}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={novaOpcao}
                    onChange={(e) => setNovaOpcao(e.target.value)}
                    placeholder="Nova opção"
                    onKeyPress={(e) => e.key === "Enter" && handleAddOpcao()}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleAddOpcao}
                    disabled={!novaOpcao.trim()}
                  >
                    <AddIcon />
                  </Button>
                </Box>
                {formData.opcoes.map((opcao, index) => (
                  <Box key={index} className={classes.optionRow}>
                    <Typography variant="body2">
                      {index + 1}. {opcao}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleRemoveOpcao(index)}
                      color="secondary"
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
                  </Box>
                ))}
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ordem"
                type="number"
                value={formData.ordem}
                onChange={handleChange("ordem")}
                variant="outlined"
                className={classes.dialogField}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.obrigatorio}
                    onChange={handleChange("obrigatorio")}
                    color="primary"
                  />
                }
                label="Obrigatório"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : (
              fieldEdit ? "Atualizar" : "Salvar"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProdutoCustomFieldModal;
