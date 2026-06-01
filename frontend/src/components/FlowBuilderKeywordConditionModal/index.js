import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field, FieldArray } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddIcon from "@material-ui/icons/Add";
import CircularProgress from "@material-ui/core/CircularProgress";
import SaveIcon from '@material-ui/icons/Save';
import CancelIcon from '@material-ui/icons/Cancel';

import { i18n } from "../../translate/i18n";

import toastError from "../../errors/toastError";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormHelperText,
  Chip
} from "@mui/material";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1
  },

  extraAttr: {
    display: "flex",
    justifyContent: "center",
    "& > *": {
      backgroundColor: "#f9f9f9",
      padding: theme.spacing(1),
    },
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
}));

const initialValues = {
  keywords: [
    { text: "", matchType: 2, color: "#10b981" }
  ],
  caseSensitive: false,
  ignoreAccents: true
};

const KeywordConditionSchema = Yup.object().shape({
  keywords: Yup.array()
    .of(
      Yup.object().shape({
        text: Yup.string()
          .min(1, "A palavra-chave é obrigatória!")
          .max(100, "Muito longo!")
          .required("Digite a palavra-chave!"),
        matchType: Yup.number()
          .oneOf([1, 2, 3, 4, 5], "Tipo de correspondência inválido!")
          .required("Selecione o tipo de correspondência!"),
        color: Yup.string()
          .required("Selecione uma cor!")
      })
    )
    .min(1, "Adicione pelo menos uma palavra-chave!")
    .required("Adicione pelo menos uma palavra-chave!"),
});

const FlowBuilderKeywordConditionModal = ({ open, onSave, onUpdate, data, close }) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const [activeModal, setActiveModal] = useState(false);

  const [initialFormValues, setInitialFormValues] = useState(initialValues);

  const [labels, setLabels] = useState({
    title: "Adicionar condição",
    btn: "Adicionar"
  });

  const colors = [
    { value: "#10b981", label: "Verde", hex: "#10b981" },
    { value: "#3b82f6", label: "Azul", hex: "#3b82f6" },
    { value: "#f59e0b", label: "Amarelo", hex: "#f59e0b" },
    { value: "#ef4444", label: "Vermelho", hex: "#ef4444" },
    { value: "#8b5cf6", label: "Roxo", hex: "#8b5cf6" },
    { value: "#ec4899", label: "Rosa", hex: "#ec4899" },
    { value: "#6b7280", label: "Cinza", hex: "#6b7280" },
  ];

  useEffect(() => {
    if (open === "edit" && data?.data) {
      setLabels({
        title: "Editar condição",
        btn: "Salvar"
      });
      setInitialFormValues({
        keywords: data.data.keywords || [{ text: "", matchType: 2, color: "#10b981" }],
        caseSensitive: data.data.caseSensitive || false,
        ignoreAccents: data.data.ignoreAccents !== undefined ? data.data.ignoreAccents : true
      });
    } else if (open === "edit" && data?.keywords) {
      setLabels({
        title: "Editar condição",
        btn: "Salvar"
      });
      setInitialFormValues({
        keywords: data.keywords || [{ text: "", matchType: 2, color: "#10b981" }],
        caseSensitive: data.caseSensitive || false,
        ignoreAccents: data.ignoreAccents !== undefined ? data.ignoreAccents : true
      });
    } else if (open === "create") {
      setLabels({
        title: "Adicionar condição",
        btn: "Adicionar"
      });
      setInitialFormValues(initialValues);
    }
    setActiveModal(open !== null);
  }, [open, data]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const handleSave = async (values) => {
    try {
      // Validar que há palavras-chave válidas
      const validKeywords = values.keywords.filter(k => k.text.trim());
      
      if (validKeywords.length === 0) {
        toast.error("Adicione pelo menos uma palavra-chave válida");
        return;
      }

      const payload = {
        keywords: validKeywords,
        caseSensitive: values.caseSensitive,
        ignoreAccents: values.ignoreAccents
      };

      if (open === "edit") {
        handleClose();
        onUpdate({
          ...data,
          data: payload
        });
      } else if (open === "create") {
        handleClose();
        onSave(payload);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const getMatchTypeDescription = (matchType) => {
    const descriptions = {
      1: "Verifica se o texto é EXATAMENTE igual à palavra-chave",
      2: "Verifica se o texto CONTÉM a palavra-chave",
      3: "Verifica se o texto COMEÇA COM a palavra-chave",
      4: "Verifica se o texto TERMINA COM a palavra-chave",
      5: "Usa expressão regular para correspondência avançada"
    };
    return descriptions[matchType] || "";
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={activeModal}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          <Typography variant="h6" style={{ color: "#3b82f6", fontWeight: 600 }}>
            {labels.title}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Formik
            initialValues={initialFormValues}
            enableReinitialize={true}
            validationSchema={KeywordConditionSchema}
            onSubmit={(values, { resetForm }) => {
              handleSave(values);
              resetForm();
            }}
          >
            {({ values, touched, errors, isSubmitting, handleChange, setFieldValue }) => (
              <Form>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Configure múltiplas palavras-chave. Cada palavra-chave direcionará para um fluxo diferente.
                      <br />
                      <strong>Digite uma palavra-chave por linha.</strong>
                    </Typography>
                  </Box>

                  <FieldArray name="keywords">
                    {({ push, remove }) => (
                      <Box>
                        {values.keywords.map((keyword, index) => (
                          <Box key={index} mb={2} p={2} border={1} borderColor="grey.300" borderRadius={2}>
                            <Stack spacing={2}>
                              <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Typography variant="subtitle2" fontWeight={600}>
                                  Palavra-chave {index + 1}
                                </Typography>
                                {values.keywords.length > 1 && (
                                  <IconButton
                                    size="small"
                                    onClick={() => remove(index)}
                                    color="error"
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>

                              <TextField
                                label="Palavra-chave"
                                variant="outlined"
                                margin="dense"
                                name={`keywords.${index}.text`}
                                value={keyword.text}
                                onChange={handleChange}
                                error={touched.keywords?.[index]?.text && Boolean(errors.keywords?.[index]?.text)}
                                helperText={touched.keywords?.[index]?.text && errors.keywords?.[index]?.text}
                                fullWidth
                                placeholder="Ex: quero, sim, não, preço"
                              />

                              <Stack direction="row" spacing={2}>
                                <Box flex={1}>
                                  <FormControl fullWidth variant="outlined">
                                    <InputLabel>Tipo</InputLabel>
                                    <Select
                                      label="Tipo"
                                      name={`keywords.${index}.matchType`}
                                      value={keyword.matchType}
                                      onChange={handleChange}
                                    >
                                      <MenuItem value={1}>
                                        <Box>
                                          <Typography variant="body1" fontWeight={600}>Exato</Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            Texto deve ser exatamente igual
                                          </Typography>
                                        </Box>
                                      </MenuItem>
                                      <MenuItem value={2}>
                                        <Box>
                                          <Typography variant="body1" fontWeight={600}>Contém</Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            Texto contém a palavra-chave
                                          </Typography>
                                        </Box>
                                      </MenuItem>
                                      <MenuItem value={3}>
                                        <Box>
                                          <Typography variant="body1" fontWeight={600}>Começa com</Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            Texto começa com a palavra-chave
                                          </Typography>
                                        </Box>
                                      </MenuItem>
                                      <MenuItem value={4}>
                                        <Box>
                                          <Typography variant="body1" fontWeight={600}>Termina com</Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            Texto termina com a palavra-chave
                                          </Typography>
                                        </Box>
                                      </MenuItem>
                                      <MenuItem value={5}>
                                        <Box>
                                          <Typography variant="body1" fontWeight={600}>Expressão Regular</Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            Usa RegEx para correspondência avançada
                                          </Typography>
                                        </Box>
                                      </MenuItem>
                                    </Select>
                                    <FormHelperText>
                                      {getMatchTypeDescription(keyword.matchType)}
                                    </FormHelperText>
                                  </FormControl>
                                </Box>

                                <Box flex={1}>
                                  <FormControl fullWidth variant="outlined">
                                    <InputLabel>Cor</InputLabel>
                                    <Select
                                      label="Cor"
                                      name={`keywords.${index}.color`}
                                      value={keyword.color}
                                      onChange={handleChange}
                                    >
                                      {colors.map((color) => (
                                        <MenuItem key={color.value} value={color.value}>
                                          <Box display="flex" alignItems="center" gap={1}>
                                            <Box
                                              width={20}
                                              height={20}
                                              bgcolor={color.hex}
                                              borderRadius="50%"
                                            />
                                            <Typography>{color.label}</Typography>
                                          </Box>
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Box>
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                        
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => push({ text: "", matchType: 2, color: colors[values.keywords.length % colors.length].value })}
                          variant="outlined"
                          color="primary"
                          fullWidth
                        >
                          Adicionar Palavra-chave
                        </Button>
                      </Box>
                    )}
                  </FieldArray>

                  <Box>
                    <FormControl fullWidth>
                      <Stack spacing={2}>
                        <Box display="flex" alignItems="center">
                          <input
                            type="checkbox"
                            id="caseSensitive"
                            name="caseSensitive"
                            checked={values.caseSensitive}
                            onChange={handleChange}
                            style={{ marginRight: 8 }}
                          />
                          <label htmlFor="caseSensitive" style={{ cursor: 'pointer' }}>
                            <Typography variant="body2">
                              Diferenciar maiúsculas e minúsculas
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              "Quero" é diferente de "quero" se marcado
                            </Typography>
                          </label>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <input
                            type="checkbox"
                            id="ignoreAccents"
                            name="ignoreAccents"
                            checked={values.ignoreAccents}
                            onChange={handleChange}
                            style={{ marginRight: 8 }}
                          />
                          <label htmlFor="ignoreAccents" style={{ cursor: 'pointer' }}>
                            <Typography variant="body2">
                              Ignorar acentos e caracteres especiais
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              "não" e "nao" são considerados iguais se marcado
                            </Typography>
                          </label>
                        </Box>
                      </Stack>
                    </FormControl>
                  </Box>
                </Stack>

                <DialogActions>
                  <Button
                    onClick={handleClose}
                    color="primary"
                    disabled={isSubmitting}
                    variant="outlined"
                    startIcon={<CancelIcon />}
                  >
                    Cancelar
                  </Button>
                  <div className={classes.btnWrapper}>
                    <Button
                      type="submit"
                      color="primary"
                      variant="contained"
                      disabled={isSubmitting}
                      className={classes.btnWrapper}
                      startIcon={<SaveIcon />}
                    >
                      {labels.btn}
                    </Button>
                    {isSubmitting && (
                      <CircularProgress
                        size={24}
                        className={classes.buttonProgress}
                      />
                    )}
                  </div>
                </DialogActions>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowBuilderKeywordConditionModal;
