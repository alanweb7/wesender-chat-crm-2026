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
  Switch,
  FormControlLabel,
  Typography,
  Box
} from "@material-ui/core";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  dialogField: {
    marginBottom: theme.spacing(2)
  },
  uploadArea: {
    border: "2px dashed #ccc",
    borderRadius: 8,
    padding: theme.spacing(3),
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.3s",
    "&:hover": {
      borderColor: theme.palette.primary.main
    }
  },
  previewImage: {
    maxWidth: 150,
    maxHeight: 150,
    objectFit: "contain",
    marginTop: theme.spacing(2)
  }
}));

const ProdutoMarcaModal = ({ open, onClose, marcaEdit, onSuccess }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    logo: "",
    active: true
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  useEffect(() => {
    if (open) {
      if (marcaEdit) {
        setFormData({
          nome: marcaEdit.nome || "",
          descricao: marcaEdit.descricao || "",
          logo: marcaEdit.logo || "",
          active: marcaEdit.active !== undefined ? marcaEdit.active : true
        });
        if (marcaEdit.logo) {
          setLogoPreview(`${process.env.REACT_APP_BACKEND_URL}/public/${marcaEdit.logo}`);
        }
      } else {
        setFormData({
          nome: "",
          descricao: "",
          logo: "",
          active: true
        });
        setLogoPreview("");
      }
      setLogoFile(null);
    }
  }, [open, marcaEdit]);

  const handleChange = (field) => (event) => {
    const value = field === "active" ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const { data } = await api.post("/produto-marcas/upload-logo", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFormData(prev => ({ ...prev, logo: data.filename }));
      setLogoPreview(`${process.env.REACT_APP_BACKEND_URL}/public/${data.filename}`);
      setLogoFile(file);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome da marca é obrigatório");
      return;
    }

    setLoading(true);

    try {
      if (marcaEdit) {
        await api.put(`/produto-marcas/${marcaEdit.id}`, formData);
        toast.success("Marca atualizada com sucesso!");
      } else {
        await api.post("/produto-marcas", formData);
        toast.success("Marca criada com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Erro ao salvar marca");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {marcaEdit ? "Editar Marca" : "Nova Marca"}
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
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.descricao}
                onChange={handleChange("descricao")}
                variant="outlined"
                multiline
                rows={3}
                className={classes.dialogField}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Logo
              </Typography>
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleLogoChange}
                disabled={uploadingLogo}
              />
              <label htmlFor="logo-upload">
                <Box className={classes.uploadArea}>
                  {uploadingLogo ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      {logoFile ? logoFile.name : "Clique para selecionar uma imagem"}
                    </Typography>
                  )}
                </Box>
              </label>
              {logoPreview && (
                <Box display="flex" justifyContent="center">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className={classes.previewImage}
                  />
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={handleChange("active")}
                    color="primary"
                  />
                }
                label="Ativo"
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
              marcaEdit ? "Atualizar" : "Salvar"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProdutoMarcaModal;
