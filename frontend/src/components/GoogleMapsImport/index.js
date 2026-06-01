import React, { useState, useRef, useEffect } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Switch,
    TextField,
    Tooltip,
    Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import GetAppIcon from "@material-ui/icons/GetApp";
import ListAltIcon from "@material-ui/icons/ListAlt";
import SearchIcon from "@material-ui/icons/Search";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { useHistory } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
    root: {
        padding: theme.spacing(3),
        maxWidth: 760,
        margin: "0 auto"
    },
    section: {
        marginBottom: theme.spacing(3)
    },
    sectionTitle: {
        fontWeight: 600,
        marginBottom: theme.spacing(1),
        color: theme.palette.text.secondary,
        textTransform: "uppercase",
        fontSize: 11,
        letterSpacing: 1
    },
    chipsBox: {
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing(0.75),
        minHeight: 36,
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1)
    },
    toggleRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing(0),
    },
    toggleLabel: {
        minWidth: 220,
        marginRight: theme.spacing(1)
    },
    socialGroup: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        padding: theme.spacing(1.5, 2),
        marginTop: theme.spacing(1)
    },
    socialTitle: {
        fontSize: 12,
        fontWeight: 600,
        marginBottom: theme.spacing(0.5),
        color: theme.palette.text.secondary
    },
    spinnerBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: theme.spacing(2),
        padding: theme.spacing(6)
    },
    iconSuccess: {
        fontSize: 64,
        color: theme.palette.success?.main || "#4caf50"
    },
    iconError: {
        fontSize: 64,
        color: theme.palette.error.main
    },
    actionRow: {
        display: "flex",
        gap: theme.spacing(1),
        justifyContent: "center",
        marginTop: theme.spacing(3)
    },
    divider: {
        margin: theme.spacing(2, 0)
    }
}));

const LANGUAGES = [
    { value: "pt-BR", label: "Português (Brasil)" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" }
];

const POLL_INTERVAL = 3000;

const defaultSocial = {
    facebooks: false,
    instagrams: false,
    tiktoks: false,
    twitters: false,
    youtubes: false
};

const GoogleMapsImport = () => {
    const classes = useStyles();
    const history = useHistory();
    const [view, setView] = useState("form");

    // Termos de busca
    const [keywordInput, setKeywordInput] = useState("");
    const [keywords, setKeywords] = useState([]);

    // Localização e idioma
    const [locationQuery, setLocationQuery] = useState("");
    const [language, setLanguage] = useState("pt-BR");

    // Limites
    const [maxResultsPerKeyword, setMaxResultsPerKeyword] = useState(20);
    const [maximumLeadsEnrichmentRecords, setMaximumLeadsEnrichmentRecords] = useState(0);

    // Dados a coletar
    const [scrapeContacts, setScrapeContacts] = useState(true);
    const [scrapeDirectories, setScrapeDirectories] = useState(false);
    const [scrapeImageAuthors, setScrapeImageAuthors] = useState(false);
    const [scrapeOrderOnline, setScrapeOrderOnline] = useState(false);
    const [scrapePlaceDetailPage, setScrapePlaceDetailPage] = useState(true);
    const [scrapeReviewsPersonalData, setScrapeReviewsPersonalData] = useState(false);
    const [scrapeTableReservationProvider, setScrapeTableReservationProvider] = useState(false);
    const [scrapeSocialMediaProfiles, setScrapeSocialMediaProfiles] = useState({ ...defaultSocial });

    // Filtros
    const [includeWebResults, setIncludeWebResults] = useState(false);
    const [skipClosedPlaces, setSkipClosedPlaces] = useState(false);
    const [verifyLeadsEnrichmentEmails, setVerifyLeadsEnrichmentEmails] = useState(false);

    // Estado do job
    const [jobId, setJobId] = useState(null);
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [progress, setProgress] = useState(0);
    const pollRef = useRef(null);

    // Dialog criar lista
    const [listDialog, setListDialog] = useState(false);
    const [listName, setListName] = useState("");
    const [listLoading, setListLoading] = useState(false);

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    useEffect(() => () => stopPolling(), []);

    const addKeyword = () => {
        const kw = keywordInput.trim();
        if (!kw) return;
        if (!keywords.includes(kw)) setKeywords(prev => [...prev, kw]);
        setKeywordInput("");
    };

    const handleKeyDown = e => {
        if (e.key === "Enter") { e.preventDefault(); addKeyword(); }
    };

    const setSocial = (key, value) =>
        setScrapeSocialMediaProfiles(prev => ({ ...prev, [key]: value }));

    const createList = async () => {
        if (!listName.trim()) { toast.warning("Informe o nome da lista"); return; }
        setListLoading(true);
        try {
            const { data } = await api.post(
                `/contacts/google-maps-scrape/${jobId}/create-list`,
                { listName: listName.trim() }
            );
            toast.success(`Lista "${data.name}" criada com ${data.inserted} contatos!`);
            setListDialog(false);
            setListName("");
            history.push("/contact-lists");
        } catch (err) {
            toast.error(err?.response?.data?.error || "Erro ao criar lista");
        } finally {
            setListLoading(false);
        }
    };

    const openGoogleMaps = () => {
        if (keywords.length === 0) return;
        const query = locationQuery
            ? `${keywords[0]} ${locationQuery}`
            : keywords[0];
        window.open(
            `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const startScrape = async () => {
        if (keywords.length === 0) {
            toast.warning("Adicione ao menos um termo de busca");
            return;
        }

        // Abre nova guia com a primeira busca no Google Maps
        openGoogleMaps();

        try {
            const { data } = await api.post("/contacts/google-maps-scrape", {
                keywords,
                locationQuery,
                language,
                maxResultsPerKeyword,
                maximumLeadsEnrichmentRecords,
                scrapeContacts,
                scrapeDirectories,
                scrapeImageAuthors,
                scrapeOrderOnline,
                scrapePlaceDetailPage,
                scrapeReviewsPersonalData,
                scrapeTableReservationProvider,
                scrapeSocialMediaProfiles,
                includeWebResults,
                skipClosedPlaces,
                verifyLeadsEnrichmentEmails
            });

            setJobId(data.jobId);
            setView("running");
            setProgress(0);

            pollRef.current = setInterval(async () => {
                try {
                    const { data: status } = await api.get(
                        `/contacts/google-maps-scrape/${data.jobId}`
                    );
                    setProgress(status.progress || 0);

                    if (status.status === "completed") {
                        stopPolling();
                        setResult(status.result);
                        setView("done");
                    } else if (status.status === "failed") {
                        stopPolling();
                        setErrorMsg(status.failedReason || "Erro desconhecido na extração");
                        setView("error");
                    }
                } catch {
                    // erro de rede — mantém polling
                }
            }, POLL_INTERVAL);
        } catch (err) {
            const msg = err?.response?.data?.error || "Erro ao iniciar extração";
            toast.error(msg);
        }
    };

    const downloadCsv = async () => {
        try {
            const response = await api.get(
                `/contacts/google-maps-scrape/${jobId}/csv`,
                { responseType: "blob" }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `contatos_maps_${jobId}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error("Erro ao baixar o CSV");
        }
    };

    const reset = () => {
        stopPolling();
        setView("form");
        setKeywords([]);
        setKeywordInput("");
        setLocationQuery("");
        setLanguage("pt-BR");
        setMaxResultsPerKeyword(20);
        setMaximumLeadsEnrichmentRecords(0);
        setScrapeContacts(true);
        setScrapeDirectories(false);
        setScrapeImageAuthors(false);
        setScrapeOrderOnline(false);
        setScrapePlaceDetailPage(true);
        setScrapeReviewsPersonalData(false);
        setScrapeTableReservationProvider(false);
        setScrapeSocialMediaProfiles({ ...defaultSocial });
        setIncludeWebResults(false);
        setSkipClosedPlaces(false);
        setVerifyLeadsEnrichmentEmails(false);
        setJobId(null);
        setResult(null);
        setErrorMsg("");
        setProgress(0);
    };

    // ──────────── views secundárias ────────────

    if (view === "running") {
        return (
            <Box className={classes.spinnerBox}>
                <CircularProgress
                    variant={progress > 0 ? "determinate" : "indeterminate"}
                    value={progress}
                    size={64}
                />
                <Typography variant="h6">Buscando no Google Maps…</Typography>
                {progress > 0 && (
                    <Typography variant="body2" color="textSecondary">
                        {progress}% concluído
                    </Typography>
                )}
                <Typography variant="body2" color="textSecondary">
                    Isso pode levar alguns minutos dependendo da quantidade de termos
                </Typography>
            </Box>
        );
    }

    if (view === "done") {
        return (
            <>
                <Box className={classes.spinnerBox}>
                    <CheckCircleOutlineIcon className={classes.iconSuccess} />
                    <Typography variant="h5">Extração concluída!</Typography>
                    {result && (
                        <Typography variant="body1">
                            <strong>{result.imported}</strong> contatos importados &nbsp;·&nbsp;{" "}
                            <strong>{result.skipped}</strong> ignorados (sem telefone ou já existentes)
                        </Typography>
                    )}
                    <Box className={classes.actionRow}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<ListAltIcon />}
                            onClick={() => {
                                setListName(`Extração Maps ${new Date().toLocaleDateString("pt-BR")}`);
                                setListDialog(true);
                            }}
                        >
                            Criar Lista de Contatos
                        </Button>
                        <Button variant="outlined" startIcon={<GetAppIcon />} onClick={downloadCsv}>
                            Baixar CSV
                        </Button>
                        <Button variant="outlined" onClick={reset}>
                            Nova Extração
                        </Button>
                    </Box>
                </Box>

                {/* Dialog nome da lista */}
                <Dialog open={listDialog} onClose={() => setListDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Criar Lista de Contatos</DialogTitle>
                    <DialogContent>
                        <TextField
                            label="Nome da lista"
                            variant="outlined"
                            fullWidth
                            autoFocus
                            value={listName}
                            onChange={e => setListName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") createList(); }}
                            helperText="A lista será criada em Usuários → Lista de contatos"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setListDialog(false)} disabled={listLoading}>
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={createList}
                            disabled={listLoading || !listName.trim()}
                        >
                            {listLoading ? <CircularProgress size={20} /> : "Criar Lista"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    if (view === "error") {
        return (
            <Box className={classes.spinnerBox}>
                <ErrorOutlineIcon className={classes.iconError} />
                <Typography variant="h6">Falha na extração</Typography>
                <Typography variant="body2" color="textSecondary" align="center" style={{ maxWidth: 480 }}>
                    {errorMsg}
                </Typography>
                <Button variant="contained" color="primary" onClick={reset}>
                    Tentar novamente
                </Button>
            </Box>
        );
    }

    // ──────────── formulário principal ────────────

    return (
        <Box className={classes.root}>
            <Typography variant="h6" gutterBottom>
                Extrair contatos do Google Maps
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
                Busca estabelecimentos no Google Maps e importa automaticamente os contatos encontrados.
                Ao iniciar, uma nova guia abrirá para você acompanhar a busca.
            </Typography>

            <Divider className={classes.divider} />

            {/* ── Termos de busca ── */}
            <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>Termos de busca</Typography>
                <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} sm={8}>
                        <TextField
                            label="Termo de busca"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={keywordInput}
                            onChange={e => setKeywordInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder='Ex: "Clínicas médicas Resende RJ"'
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={addKeyword} size="small">
                                            <AddIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Idioma dos resultados"
                            variant="outlined"
                            select
                            fullWidth
                            size="small"
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                        >
                            {LANGUAGES.map(l => (
                                <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Box className={classes.chipsBox}>
                    {keywords.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                            Nenhum termo adicionado
                        </Typography>
                    ) : (
                        keywords.map(kw => (
                            <Chip
                                key={kw}
                                label={kw}
                                onDelete={() => setKeywords(prev => prev.filter(k => k !== kw))}
                                color="primary"
                                variant="outlined"
                                size="small"
                            />
                        ))
                    )}
                </Box>
            </Box>

            {/* ── Localização ── */}
            <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>Localização</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                        <TextField
                            label="Consulta de localização"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={locationQuery}
                            onChange={e => setLocationQuery(e.target.value)}
                            placeholder='Ex: "Resende, Rio de Janeiro, Brasil"'
                            helperText="Será combinada com cada termo de busca"
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* ── Limites ── */}
            <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>Limites</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Máximo de lugares por busca"
                            variant="outlined"
                            type="number"
                            size="small"
                            fullWidth
                            value={maxResultsPerKeyword}
                            onChange={e =>
                                setMaxResultsPerKeyword(Math.min(60, Math.max(1, Number(e.target.value))))
                            }
                            inputProps={{ min: 1, max: 60 }}
                            helperText="Entre 1 e 60 por termo"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Máximo de registros para enriquecimento"
                            variant="outlined"
                            type="number"
                            size="small"
                            fullWidth
                            value={maximumLeadsEnrichmentRecords}
                            onChange={e =>
                                setMaximumLeadsEnrichmentRecords(Math.max(0, Number(e.target.value)))
                            }
                            inputProps={{ min: 0 }}
                            helperText="0 = sem limite"
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* ── Dados a coletar ── */}
            <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>Dados a coletar</Typography>
                <Box className={classes.toggleRow}>
                    {[
                        { label: "Contatos (telefone/email)", value: scrapeContacts, set: setScrapeContacts },
                        { label: "Página de detalhe do lugar", value: scrapePlaceDetailPage, set: setScrapePlaceDetailPage },
                        { label: "Diretórios", value: scrapeDirectories, set: setScrapeDirectories },
                        { label: "Autores de imagens", value: scrapeImageAuthors, set: setScrapeImageAuthors },
                        { label: "Pedidos online", value: scrapeOrderOnline, set: setScrapeOrderOnline },
                        { label: "Dados pessoais de avaliações", value: scrapeReviewsPersonalData, set: setScrapeReviewsPersonalData },
                        { label: "Reservas de mesa", value: scrapeTableReservationProvider, set: setScrapeTableReservationProvider },
                    ].map(({ label, value, set }) => (
                        <FormControlLabel
                            key={label}
                            className={classes.toggleLabel}
                            control={
                                <Switch
                                    checked={value}
                                    onChange={e => set(e.target.checked)}
                                    color="primary"
                                    size="small"
                                />
                            }
                            label={<Typography variant="body2">{label}</Typography>}
                        />
                    ))}
                </Box>

                {/* Perfis sociais */}
                <Paper variant="outlined" className={classes.socialGroup}>
                    <Typography className={classes.socialTitle}>Coletar perfis sociais</Typography>
                    <Box className={classes.toggleRow}>
                        {[
                            { key: "facebooks", label: "Facebook" },
                            { key: "instagrams", label: "Instagram" },
                            { key: "tiktoks", label: "TikTok" },
                            { key: "twitters", label: "X / Twitter" },
                            { key: "youtubes", label: "YouTube" }
                        ].map(({ key, label }) => (
                            <FormControlLabel
                                key={key}
                                control={
                                    <Switch
                                        checked={scrapeSocialMediaProfiles[key] || false}
                                        onChange={e => setSocial(key, e.target.checked)}
                                        color="primary"
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2">{label}</Typography>}
                            />
                        ))}
                    </Box>
                </Paper>
            </Box>

            {/* ── Filtros ── */}
            <Box className={classes.section}>
                <Typography className={classes.sectionTitle}>Filtros</Typography>
                <Box className={classes.toggleRow}>
                    <FormControlLabel
                        className={classes.toggleLabel}
                        control={
                            <Switch
                                checked={skipClosedPlaces}
                                onChange={e => setSkipClosedPlaces(e.target.checked)}
                                color="primary"
                                size="small"
                            />
                        }
                        label={<Typography variant="body2">Ignorar lugares fechados</Typography>}
                    />
                    <FormControlLabel
                        className={classes.toggleLabel}
                        control={
                            <Switch
                                checked={includeWebResults}
                                onChange={e => setIncludeWebResults(e.target.checked)}
                                color="primary"
                                size="small"
                            />
                        }
                        label={<Typography variant="body2">Incluir resultados da web</Typography>}
                    />
                    <FormControlLabel
                        className={classes.toggleLabel}
                        control={
                            <Switch
                                checked={verifyLeadsEnrichmentEmails}
                                onChange={e => setVerifyLeadsEnrichmentEmails(e.target.checked)}
                                color="primary"
                                size="small"
                            />
                        }
                        label={<Typography variant="body2">Verificar e-mails dos leads</Typography>}
                    />
                </Box>
            </Box>

            <Divider className={classes.divider} />

            {/* ── Ações ── */}
            <Box display="flex" gap={1} flexWrap="wrap" style={{ gap: 8 }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<SearchIcon />}
                    onClick={startScrape}
                    disabled={keywords.length === 0}
                >
                    Iniciar Extração
                </Button>
                <Tooltip title="Abre o Google Maps com o primeiro termo de busca">
                    <span>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<OpenInNewIcon />}
                            onClick={openGoogleMaps}
                            disabled={keywords.length === 0}
                        >
                            Ver no Maps
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                    💡 Requer <strong>GOOGLE_PLACES_API_KEY</strong> no .env — a API do Google Places
                    oferece $200/mês de crédito gratuito (≈ 6.000 buscas).
                </Typography>
            </Box>
        </Box>
    );
};

export default GoogleMapsImport;
