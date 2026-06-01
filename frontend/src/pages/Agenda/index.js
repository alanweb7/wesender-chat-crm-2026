import React, { useState, useEffect, useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  Avatar
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import EventIcon from "@material-ui/icons/Event";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import PersonIcon from "@material-ui/icons/Person";
import BuildIcon from "@material-ui/icons/Build";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import TodayIcon from "@material-ui/icons/Today";

import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import moment from "moment";
import "moment/locale/pt-br";

import {
  listUserSchedules,
  listAppointments,
  updateAppointment,
  deleteAppointment
} from "../../services/userScheduleService";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";
import AppointmentModal from "../../components/AppointmentModal";
import { AuthContext } from "../../context/Auth/AuthContext";

moment.locale("pt-br");

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
    gap: theme.spacing(3),
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(2)
  },
  titleSection: {
    display: "flex",
    flexDirection: "column"
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: theme.palette.text.primary
  },
  subtitle: {
    fontSize: 14,
    color: theme.palette.text.secondary
  },
  filters: {
    display: "flex",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    alignItems: "center"
  },
  filterField: {
    minWidth: 150
  },
  tableContainer: {
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
  },
  tableHead: {
    backgroundColor: theme.palette.grey[100]
  },
  tableHeadCell: {
    fontWeight: 600
  },
  statusChip: {
    fontWeight: 600,
    fontSize: 12
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(6),
    color: theme.palette.text.secondary
  },
  appointmentInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  appointmentTitle: {
    fontWeight: 600
  },
  appointmentMeta: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    color: theme.palette.text.secondary
  },
  actionsBox: {
    display: "flex",
    justifyContent: "center",
    gap: 4
  },
  content: {
    display: "flex",
    gap: theme.spacing(3),
    flexWrap: "wrap"
  },
  listColumn: {
    flex: 2,
    minWidth: 320,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: 8,
    gap: theme.spacing(2),
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  itemAvatar: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff"
  },
  itemInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  itemName: {
    fontWeight: 600,
    fontSize: 14
  },
  itemDetails: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: theme.palette.text.secondary
  },
  itemActions: {
    display: "flex",
    gap: 4
  },
  actionButton: {
    padding: 4
  },
  calendarColumn: {
    flex: 1,
    minWidth: 320,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  },
  calendarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: theme.palette.text.primary,
    textTransform: "capitalize"
  },
  calendarNav: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5)
  },
  navButton: {
    padding: 4
  },
  todayButton: {
    padding: theme.spacing(0.5, 1),
    border: "1px solid",
    borderColor: theme.palette.divider,
    backgroundColor: "transparent",
    borderRadius: 4,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  weekDays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 4,
    marginBottom: theme.spacing(1)
  },
  weekDay: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    padding: theme.spacing(0.5),
    textTransform: "uppercase"
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 4
  },
  calendarDay: {
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.2s",
    border: "1px solid transparent",
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    }
  },
  dayOtherMonth: {
    color: theme.palette.text.disabled,
    opacity: 0.5
  },
  dayToday: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    fontWeight: 600
  },
  daySelected: {
    border: `2px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.dark
  },
  dayHasEvent: {
    backgroundColor: theme.palette.secondary.main,
    color: "#fff"
  }
}));

const statusColors = {
  scheduled: { bg: "#3b82f6", label: "Agendado" },
  confirmed: { bg: "#059669", label: "Confirmado" },
  completed: { bg: "#6b7280", label: "Concluído" },
  cancelled: { bg: "#ef4444", label: "Cancelado" },
  no_show: { bg: "#f59e0b", label: "Não compareceu" }
};

const Agenda = () => {
  const classes = useStyles();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const normalizedUserType = (user?.userType || "").toLowerCase();
  const isRestrictedUserType = ["attendant", "professional"].includes(normalizedUserType);

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [filters, setFilters] = useState({
    scheduleId: "",
    status: "",
    startDate: "",
    endDate: ""
  });
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (location && location.search) {
      const queryParams = new URLSearchParams(location.search);
      const scheduleIdParam = queryParams.get("scheduleId");
      if (scheduleIdParam) {
        setFilters(prev => ({ ...prev, scheduleId: scheduleIdParam }));
      }
    }
  }, [location]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.scheduleId) params.scheduleId = filters.scheduleId;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const data = await listAppointments(params);
      setAppointments(data.appointments || []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await listUserSchedules();
      setSchedules(data.schedules || []);

      if (isRestrictedUserType) {
        const ownSchedule = data.schedules?.[0];
        if (ownSchedule) {
          setFilters(prev => ({ ...prev, scheduleId: String(ownSchedule.id) }));
        }
      }
    } catch (err) {
      console.error("Erro ao buscar agendas:", err);
    }
  }, [isRestrictedUserType]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleOpenModal = (appointment = null) => {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleDelete = async () => {
    try {
      await deleteAppointment(selectedAppointment.id);
      toast.success("Compromisso excluído com sucesso");
      setConfirmModalOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenDeleteModal = (appointment) => {
    setSelectedAppointment(appointment);
    setConfirmModalOpen(true);
  };

  const handleStatusChange = async (appointment, newStatus) => {
    try {
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success("Status atualizado");
      fetchAppointments();
    } catch (err) {
      toastError(err);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Funções do calendário
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getDaysInMonth = () => {
    const startOfMonth = currentDate.clone().startOf("month");
    const endOfMonth = currentDate.clone().endOf("month");
    const startOfWeek = startOfMonth.clone().startOf("week");
    const endOfWeek = endOfMonth.clone().endOf("week");
    const days = [];
    const day = startOfWeek.clone();
    while (day.isBefore(endOfWeek, "day")) {
      days.push(day.clone());
      day.add(1, "day");
    }
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.clone().subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setCurrentDate(currentDate.clone().add(1, "month"));
  };

  const goToToday = () => {
    setCurrentDate(moment());
    setSelectedDate(moment());
  };

  const hasEventOnDay = (day) => {
    return appointments.some((appointment) => {
      const appointmentDate = moment(appointment.startDatetime);
      return appointmentDate.isSame(day, "day");
    });
  };

  const getFilteredAppointments = () => {
    if (selectedDate) {
      return appointments.filter((appointment) => {
        const appointmentDate = moment(appointment.startDatetime);
        return appointmentDate.isSame(selectedDate, "day");
      });
    }
    return appointments;
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box className={classes.titleSection}>
          <Typography className={classes.title}>Compromissos</Typography>
          <Typography className={classes.subtitle}>
            {appointments.length} compromisso(s) encontrado(s)
          </Typography>
        </Box>

        <Box className={classes.filters}>
          <FormControl variant="outlined" size="small" className={classes.filterField}>
            <InputLabel>Agenda</InputLabel>
            <Select
              value={filters.scheduleId}
              onChange={handleFilterChange("scheduleId")}
              label="Agenda"
            >
              <MenuItem value="">Todas</MenuItem>
              {schedules.map((schedule) => (
                <MenuItem key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" className={classes.filterField}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={handleFilterChange("status")}
              label="Status"
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(statusColors).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            type="date"
            label="Data Início"
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.startDate}
            onChange={handleFilterChange("startDate")}
          />

          <TextField
            type="date"
            label="Data Fim"
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.endDate}
            onChange={handleFilterChange("endDate")}
          />

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
          >
            Novo Compromisso
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box className={classes.loadingContainer}>
          <CircularProgress />
        </Box>
      ) : (
        <Box className={classes.content}>
          {/* Coluna da Lista */}
          <Box className={classes.listColumn}>
            <Typography className={classes.listHeader}>
              {selectedDate
                ? `Compromissos de ${selectedDate.format("DD/MM/YYYY")}`
                : "Todos os compromissos"}
            </Typography>

            {getFilteredAppointments().length === 0 ? (
              <Box className={classes.emptyState}>
                <EventIcon style={{ fontSize: 48, marginBottom: 8 }} />
                <Typography>Nenhum compromisso encontrado</Typography>
              </Box>
            ) : (
              getFilteredAppointments().map((appointment) => (
                <Box key={appointment.id} className={classes.listItem}>
                  <Avatar className={classes.itemAvatar}>
                    <EventIcon />
                  </Avatar>
                  <Box className={classes.itemInfo}>
                    <Typography className={classes.itemName}>
                      {appointment.title}
                    </Typography>
                    <Box className={classes.itemDetails}>
                      <span>{formatDateTime(appointment.startDatetime)}</span>
                      <span>•</span>
                      <span>{formatDuration(appointment.durationMinutes)}</span>
                      <span>•</span>
                      <Chip
                        label={statusColors[appointment.status]?.label || appointment.status}
                        size="small"
                        className={classes.statusChip}
                        style={{
                          backgroundColor: statusColors[appointment.status]?.bg || "#6b7280",
                          color: "#fff",
                          height: 20,
                          fontSize: 10
                        }}
                      />
                    </Box>
                  </Box>
                  <Box className={classes.itemActions}>
                    {appointment.status === "scheduled" && (
                      <Tooltip title="Confirmar">
                        <IconButton
                          size="small"
                          className={classes.actionButton}
                          onClick={() => handleStatusChange(appointment, "confirmed")}
                        >
                          <CheckCircleIcon fontSize="small" style={{ color: "#059669" }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                      <Tooltip title="Cancelar">
                        <IconButton
                          size="small"
                          className={classes.actionButton}
                          onClick={() => handleStatusChange(appointment, "cancelled")}
                        >
                          <CancelIcon fontSize="small" style={{ color: "#ef4444" }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        className={classes.actionButton}
                        onClick={() => handleOpenModal(appointment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        className={classes.actionButton}
                        onClick={() => handleOpenDeleteModal(appointment)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Coluna do Calendário */}
          <Box className={classes.calendarColumn}>
            <Box className={classes.calendarHeader}>
              <Typography className={classes.calendarTitle}>
                {currentDate.format("MMMM YYYY")}
              </Typography>
              <Box className={classes.calendarNav}>
                <button className={classes.todayButton} onClick={goToToday}>
                  Hoje
                </button>
                <IconButton
                  className={classes.navButton}
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton className={classes.navButton} onClick={goToNextMonth}>
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>

            <Box className={classes.weekDays}>
              {weekDays.map((day) => (
                <Typography key={day} className={classes.weekDay}>
                  {day}
                </Typography>
              ))}
            </Box>

            <Box className={classes.calendarGrid}>
              {getDaysInMonth().map((day, index) => {
                const isCurrentMonth = day.isSame(currentDate, "month");
                const isToday = day.isSame(moment(), "day");
                const isSelected = selectedDate && day.isSame(selectedDate, "day");
                const hasEvent = hasEventOnDay(day);

                return (
                  <Box
                    key={index}
                    className={`
                      ${classes.calendarDay}
                      ${!isCurrentMonth ? classes.dayOtherMonth : ""}
                      ${isToday ? classes.dayToday : ""}
                      ${isSelected && !isToday ? classes.daySelected : ""}
                      ${hasEvent ? classes.dayHasEvent : ""}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    {day.date()}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      <AppointmentModal
        open={modalOpen}
        onClose={handleCloseModal}
        appointment={selectedAppointment}
        onSave={fetchAppointments}
        initialScheduleId={filters.scheduleId || ""}
        existingAppointments={appointments}
      />

      <ConfirmationModal
        title="Excluir Compromisso"
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDelete}
      >
        Tem certeza que deseja excluir o compromisso "{selectedAppointment?.title}"?
      </ConfirmationModal>
    </Box>
  );
};

export default Agenda;