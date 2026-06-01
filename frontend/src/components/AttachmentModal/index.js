import React from "react";
import {
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
  Slide,
  IconButton,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import DescriptionIcon from "@material-ui/icons/Description";
import PhotoLibraryIcon from "@material-ui/icons/PhotoLibrary";
import CameraAltIcon from "@material-ui/icons/CameraAlt";
import MicIcon from "@material-ui/icons/Mic";
import ContactsIcon from "@material-ui/icons/Contacts";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import EmojiEmotionsIcon from "@material-ui/icons/EmojiEmotions";
import ScheduleIcon from "@material-ui/icons/Schedule";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      backgroundColor: "#1f2c33",
      borderRadius: "12px",
      maxWidth: "360px",
      width: "100%",
    },
  },
  dialogContent: {
    padding: 0,
    backgroundColor: "#1f2c33",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #2a3942",
  },
  headerTitle: {
    color: "#e9edef",
    fontSize: "16px",
    fontWeight: 500,
  },
  closeButton: {
    color: "#8696a0",
    padding: 4,
    "&:hover": {
      backgroundColor: "rgba(134, 150, 160, 0.1)",
    },
  },
  list: {
    padding: "8px 0",
  },
  listItem: {
    padding: "12px 20px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#2a3942",
    },
  },
  listItemIcon: {
    minWidth: 48,
    "& svg": {
      fontSize: 24,
    },
  },
  listItemText: {
    "& .MuiListItemText-primary": {
      color: "#e9edef",
      fontSize: "14.2px",
      fontWeight: 400,
    },
  },
  documentIcon: {
    color: "#5157ae",
  },
  photoIcon: {
    color: "#d3396d",
  },
  cameraIcon: {
    color: "#d3396d",
  },
  audioIcon: {
    color: "#f57c00",
  },
  contactIcon: {
    color: "#009de2",
  },
  locationIcon: {
    color: "#1fa855",
  },
  stickerIcon: {
    color: "#00a884",
  },
  scheduleIcon: {
    color: "#d3396d",
  },
}));

const AttachmentModal = ({ open, onClose, onSelectOption }) => {
  const classes = useStyles();

  const attachmentOptions = [
    {
      id: "document",
      label: "Documento",
      icon: <DescriptionIcon />,
      iconClass: classes.documentIcon,
      accept: "*/*",
    },
    {
      id: "photos-videos",
      label: "Fotos e vídeos",
      icon: <PhotoLibraryIcon />,
      iconClass: classes.photoIcon,
      accept: "image/*,video/*",
    },
    {
      id: "camera",
      label: "Câmera",
      icon: <CameraAltIcon />,
      iconClass: classes.cameraIcon,
    },
    {
      id: "audio",
      label: "Áudio",
      icon: <MicIcon />,
      iconClass: classes.audioIcon,
      accept: "audio/*",
    },
    {
      id: "contact",
      label: "Contato",
      icon: <ContactsIcon />,
      iconClass: classes.contactIcon,
    },
    {
      id: "location",
      label: "Localização",
      icon: <LocationOnIcon />,
      iconClass: classes.locationIcon,
    },
    {
      id: "schedule",
      label: "Evento",
      icon: <ScheduleIcon />,
      iconClass: classes.scheduleIcon,
    },
  ];

  const handleOptionClick = (option) => {
    if (onSelectOption) {
      onSelectOption(option);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      className={classes.dialog}
      maxWidth="xs"
      fullWidth
    >
      <div className={classes.header}>
        <span className={classes.headerTitle}>Anexar</span>
        <IconButton
          className={classes.closeButton}
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </div>
      <DialogContent className={classes.dialogContent}>
        <List className={classes.list}>
          {attachmentOptions.map((option) => (
            <ListItem
              key={option.id}
              className={classes.listItem}
              onClick={() => handleOptionClick(option)}
            >
              <ListItemIcon className={classes.listItemIcon}>
                <span className={option.iconClass}>{option.icon}</span>
              </ListItemIcon>
              <ListItemText
                primary={option.label}
                className={classes.listItemText}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentModal;
