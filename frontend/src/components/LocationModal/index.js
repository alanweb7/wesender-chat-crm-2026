import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  makeStyles,
  CircularProgress,
  Typography,
  InputAdornment,
} from "@material-ui/core";
import { toast } from "react-toastify";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import MyLocationIcon from "@material-ui/icons/MyLocation";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minWidth: 400,
  },
  locationButton: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  coordinatesText: {
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
}));

const LocationModal = ({ open, onClose, onSend }) => {
  const classes = useStyles();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não é suportada pelo seu navegador");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        
        // Buscar endereço usando reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress(`${lat}, ${lng}`);
          }
        } catch (error) {
          console.error("Erro ao buscar endereço:", error);
          setAddress(`${lat}, ${lng}`);
        }
        
        setLoading(false);
        toast.success("Localização obtida com sucesso!");
      },
      (error) => {
        setLoading(false);
        console.error("Erro ao obter localização:", error);
        toast.error("Erro ao obter localização. Verifique as permissões.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSearchAddress = async () => {
    if (!address || address.trim() === "") {
      toast.error("Digite um endereço para buscar");
      return;
    }

    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&accept-language=pt-BR&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const location = data[0];
        setLatitude(parseFloat(location.lat).toFixed(6));
        setLongitude(parseFloat(location.lon).toFixed(6));
        setAddress(location.display_name);
        toast.success("Endereço encontrado!");
      } else {
        toast.error("Endereço não encontrado. Tente ser mais específico.");
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      toast.error("Erro ao buscar endereço. Tente novamente.");
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSend = async () => {
    // Se tem endereço mas não tem coordenadas, buscar primeiro
    if (address && (!latitude || !longitude)) {
      await handleSearchAddress();
      // Aguardar um pouco para garantir que as coordenadas foram setadas
      setTimeout(() => {
        if (latitude && longitude) {
          proceedWithSend();
        }
      }, 500);
      return;
    }

    proceedWithSend();
  };

  const proceedWithSend = () => {
    if (!latitude || !longitude) {
      toast.error("Informe um endereço ou use sua localização atual");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Coordenadas inválidas");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Coordenadas fora do intervalo válido");
      return;
    }

    onSend({
      latitude: lat,
      longitude: lng,
      address: address || `${lat}, ${lng}`,
    });

    handleClose();
  };

  const handleClose = () => {
    setLatitude("");
    setLongitude("");
    setAddress("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <LocationOnIcon style={{ verticalAlign: "middle", marginRight: 8 }} />
        Enviar Localização
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          className={classes.locationButton}
          startIcon={loading ? <CircularProgress size={20} /> : <MyLocationIcon />}
          onClick={handleGetCurrentLocation}
          disabled={loading}
        >
          {loading ? "Obtendo localização..." : "Usar minha localização atual"}
        </Button>

        <TextField
          label="Latitude (preenchido automaticamente)"
          type="number"
          fullWidth
          margin="dense"
          variant="outlined"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          placeholder="-23.550520"
          inputProps={{ step: "0.000001" }}
          disabled={searchingAddress}
        />

        <TextField
          label="Longitude (preenchido automaticamente)"
          type="number"
          fullWidth
          margin="dense"
          variant="outlined"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          placeholder="-46.633308"
          inputProps={{ step: "0.000001" }}
          disabled={searchingAddress}
        />

        <TextField
          label="Endereço"
          fullWidth
          margin="dense"
          variant="outlined"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearchAddress();
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  color="primary"
                  onClick={handleSearchAddress}
                  disabled={searchingAddress || !address}
                >
                  {searchingAddress ? <CircularProgress size={20} /> : "Buscar"}
                </Button>
              </InputAdornment>
            ),
          }}
        />

        <Typography variant="caption" style={{ color: '#666', marginTop: 8, display: 'block' }}>
          💡 Digite um endereço e clique em "Buscar" para obter as coordenadas automaticamente
        </Typography>

        {latitude && longitude && (
          <Typography variant="caption" className={classes.coordinatesText}>
            📍 Google Maps: https://maps.google.com/?q={latitude},{longitude}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancelar
        </Button>
        <Button
          onClick={handleSend}
          color="primary"
          variant="contained"
          disabled={(!latitude || !longitude) && !address}
        >
          Enviar Localização
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationModal;
