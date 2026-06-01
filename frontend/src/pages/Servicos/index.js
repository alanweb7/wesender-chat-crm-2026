import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import MonetizationOnIcon from "@material-ui/icons/MonetizationOn";
import { toast } from "react-toastify";

import ServiceModal from "../../components/ServiceModal";
import { listServicos, deleteServico } from "../../services/servicosService";

const DISCOUNT_FILTERS = [
  { label: "Todos", value: "" },
  { label: "Com tempo", value: "with" },
  { label: "Sem tempo", value: "without" }
];

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: "#666",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchField: {
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": {
        borderColor: "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: "#1976d2",
      },
    },
  },
  filterSelect: {
    minWidth: 180,
    backgroundColor: "#fff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#333",
      transform: "scale(1.05)",
    },
  },
  content: {
    flex: 1,
    padding: "16px 24px",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      fontSize: 24,
      color: "#ff9800",
    },
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: "cover",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16
  },
  itemName: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a"
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.8rem",
    color: "#666",
  },
  itemValue: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#4caf50",
  },
  highlightValue: {
    color: "#1a1a1a",
    fontWeight: 600
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
    },
  },
  editButton: {
    "&:hover": {
      backgroundColor: "#e3f2fd",
      color: "#1976d2",
    },
  },
  deleteButton: {
    "&:hover": {
      backgroundColor: "#ffebee",
      color: "#d32f2f",
    },
  },
  emptyState: {
    padding: "48px",
    textAlign: "center",
    color: "#666",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px"
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "24px"
  }
}));

const ServicosPage = () => {
  const classes = useStyles();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [discountFilter, setDiscountFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data } = await listServicos();
      const list = Array.isArray(data) ? data : (data?.servicos || data?.services || []);
      setServices(list);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error("Não foi possível carregar os serviços");
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services.filter(service => {
      const matchesText =
        !term ||
        service.nome?.toLowerCase().includes(term) ||
        service.descricao?.toLowerCase().includes(term) ||
        String(service.id).includes(term);
      const matchesTime =
        discountFilter === "" ||
        (discountFilter === "with" && service.tempoAtendimento) ||
        (discountFilter === "without" && !service.tempoAtendimento);
      return matchesText && matchesTime;
    });
  }, [services, search, discountFilter]);

  const handleOpenModal = (service = null) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
    setModalOpen(false);
  };

  const handleModalSuccess = () => {
    handleCloseModal();
    fetchServices();
  };

  const handleDelete = service => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteServico(serviceToDelete.id);
      toast.success("Serviço removido com sucesso!");
      fetchServices();
    } catch (error) {
      console.error("Erro ao remover serviço:", error);
      toast.error("Não foi possível remover o serviço");
    } finally {
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const formatCurrency = value =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div className={classes.headerLeft}>
          <div className={classes.headerIcon}>
            <MonetizationOnIcon />
          </div>
          <div>
            <Typography className={classes.headerTitle}>Serviços</Typography>
          </div>
        </div>

        <div className={classes.headerRight}>
          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel id="filter-tipo-label">Filtro</InputLabel>
            <Select
              labelId="filter-tipo-label"
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value)}
              label="Filtro"
            >
              {DISCOUNT_FILTERS.map(filter => (
                <MenuItem key={filter.value} value={filter.value}>
                  {filter.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            placeholder="Buscar serviço..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "#999" }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Adicionar Serviço">
            <button className={classes.addButton} onClick={() => handleOpenModal()}>
              <AddIcon style={{ fontSize: 24 }} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <Box className={classes.content}>
        {loading ? (
          <Box className={classes.loadingBox}>
            <CircularProgress size={32} />
            <Typography color="textSecondary">Carregando serviços...</Typography>
          </Box>
        ) : !filteredServices.length ? (
          <Box className={classes.emptyState}>
            <MonetizationOnIcon style={{ fontSize: 56 }} />
            <Typography variant="h6">Nenhum serviço encontrado</Typography>
            <Typography variant="body2" color="textSecondary">
              Ajuste os filtros ou cadastre um novo serviço para começar.
            </Typography>
          </Box>
        ) : (
          <div>
            {filteredServices.map(service => (
              <div key={service.id} className={classes.listItem}>
                {service.imagem ? (
                  <img
                    src={service.imagem}
                    alt={service.nome}
                    className={classes.itemImage}
                  />
                ) : (
                  <Box className={classes.itemIcon}>
                    <MonetizationOnIcon />
                  </Box>
                )}

                <Box className={classes.itemInfo}>
                  <Typography className={classes.itemName}>{service.nome}</Typography>
                  <Box className={classes.itemDetails}>
                    <span>ID: {service.id}</span>
                    <span>•</span>
                    <span>{service.tempoAtendimento ? `${service.tempoAtendimento} min` : "Sem tempo"}</span>
                  </Box>
                </Box>

                <Typography className={classes.itemValue}>
                  {formatCurrency(service.valorOriginal)}
                </Typography>

                <Box className={classes.itemActions} style={{ marginLeft: 16 }}>
                  <Tooltip title="Editar serviço">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.editButton}`}
                      onClick={() => handleOpenModal(service)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir serviço">
                    <IconButton
                      size="small"
                      className={`${classes.actionButton} ${classes.deleteButton}`}
                      onClick={() => handleDelete(service)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </div>
            ))}
          </div>
        )}
      </Box>

      <ServiceModal
        open={modalOpen}
        onClose={handleCloseModal}
        service={selectedService}
        onSuccess={handleModalSuccess}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remover serviço</DialogTitle>
        <DialogContent>
          <Typography>Deseja remover o serviço "{serviceToDelete?.nome}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button color="secondary" variant="contained" onClick={confirmDelete}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ServicosPage;
