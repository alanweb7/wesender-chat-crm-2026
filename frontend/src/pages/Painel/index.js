import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Chip,
} from "@material-ui/core";
import ArrowBackIos from '@material-ui/icons/ArrowBackIos';
import ArrowForwardIos from '@material-ui/icons/ArrowForwardIos';
import DashboardIcon from '@material-ui/icons/Dashboard';
import Event from '@material-ui/icons/Event';
import Loop from '@material-ui/icons/Loop';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import moment from "moment";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import { listSliderBanners } from "../../services/sliderHomeService";
import { getBackendUrl } from "../../config";
import useDashboard from "../../hooks/useDashboard";
import useCompanies from "../../hooks/useCompanies";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(3),
    minHeight: '100vh',
    background: '#f8fafc',
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: theme.spacing(0.5),
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  bannerSlider: {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: theme.spacing(3),
    background: '#e2e8f0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bannerArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'all 0.2s',
    '&:hover': {
      background: 'rgba(255, 255, 255, 1)',
      transform: 'translateY(-50%) scale(1.1)',
    },
  },
  bannerArrowLeft: {
    left: 16,
  },
  bannerArrowRight: {
    right: 16,
  },
  bannerDots: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 8,
    zIndex: 10,
  },
  bannerDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&.active': {
      background: '#fff',
      transform: 'scale(1.2)',
    },
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: theme.spacing(2),
  },
  indicatorCard: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    height: '100%',
  },
  indicatorLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 500,
    marginBottom: theme.spacing(0.5),
  },
  indicatorValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: theme.spacing(0.5),
  },
  indicatorTrend: {
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  trendUp: {
    color: '#10b981',
    fontWeight: 600,
  },
  trendDown: {
    color: '#ef4444',
    fontWeight: 600,
  },
  trendNeutral: {
    color: '#9ca3af',
  },
  chartCard: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    height: '100%',
  },
  chartHeader: {
    marginBottom: theme.spacing(2),
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
  },
  simpleBarChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    height: 200,
    padding: theme.spacing(1),
  },
  bar: {
    flex: 1,
    background: '#3b82f6',
    borderRadius: 4,
    transition: 'all 0.2s',
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.8,
    },
  },
  barLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  simpleDonut: {
    width: 200,
    height: 200,
    borderRadius: '50%',
    margin: '0 auto',
    position: 'relative',
  },
  donutLegend: {
    marginTop: theme.spacing(2),
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#374151',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  simpleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  gridItem: {
    background: '#f8fafc',
    borderRadius: 8,
    padding: theme.spacing(1.5),
    textAlign: 'center',
  },
  gridItemLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  gridItemValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
  },
  tutorialsSection: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    marginBottom: theme.spacing(3),
  },
  tutorialsTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: theme.spacing(2),
  },
  tutorialCard: {
    background: '#f8fafc',
    borderRadius: 8,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
  },
  tutorialThumbnail: {
    width: '100%',
    height: 120,
    objectFit: 'cover',
  },
  tutorialInfo: {
    padding: theme.spacing(1.5),
  },
  tutorialName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
}));

const Dashboard = () => {
  const classes = useStyles();
  const { user } = React.useContext(AuthContext);
  const { find: findDashboard } = useDashboard();
  const { find: findCompanies } = useCompanies();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [companyPlan, setCompanyPlan] = useState({});
  const [sliderBanners, setSliderBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadDashboardData();
    loadBanners();
    loadCompanyPlan();
  }, []);

  const loadBanners = async () => {
    try {
      console.log('[Dashboard] Carregando banners...');
      const response = await listSliderBanners();
      console.log('[Dashboard] Resposta da API:', response);
      
      const banners = response.data || [];
      console.log('[Dashboard] Banners recebidos:', banners);
      
      if (banners.length > 0) {
        console.log('[Dashboard] Usando banners da API');
        setSliderBanners(banners);
      } else {
        console.log('[Dashboard] Nenhum banner cadastrado, usando fallback');
        // Fallback para banners mock se não houver banners cadastrados
        setSliderBanners([
          { name: "Bem-vindo ao AtendZappy" },
          { name: "Gerencie seus atendimentos" },
          { name: "Relatórios detalhados" },
        ]);
      }
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar banners:', error);
      // Usar banners mock em caso de erro
      setSliderBanners([
        { name: "Bem-vindo ao AtendZappy" },
      ]);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD'),
      };
      const data = await findDashboard(params);
      console.log('[Dashboard] Dados recebidos:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyPlan = async () => {
    try {
      const companies = await findCompanies();
      const currentCompany = companies.find(c => c.id === user?.companyId);
      if (currentCompany) {
        setCompanyPlan({
          planName: currentCompany.planName || currentCompany.plan?.name || "Plano Básico",
          startDate: currentCompany.dueDate || moment().format('YYYY-MM-DD'),
          dueDate: currentCompany.dueDate || moment().add(30, 'days').format('YYYY-MM-DD'),
          recurrence: currentCompany.recurrence || "MENSAL",
          trial: currentCompany.trial || false,
        });
      }
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar plano:', error);
      setCompanyPlan({
        planName: "Plano Básico",
        startDate: moment().format('YYYY-MM-DD'),
        dueDate: moment().add(30, 'days').format('YYYY-MM-DD'),
        recurrence: "MENSAL",
        trial: false,
      });
    }
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? sliderBanners.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === sliderBanners.length - 1 ? 0 : prev + 1));
  };

  const buildBannerImageUrl = (banner) => {
    console.log('[Dashboard] buildBannerImageUrl - banner:', banner);
    
    if (!banner) {
      console.log('[Dashboard] Banner vazio');
      return null;
    }
    
    // Tentar diferentes campos de imagem
    const imagePath = banner.image || banner.imageUrl || banner.mediaPath;
    
    if (!imagePath) {
      console.log('[Dashboard] Sem campo de imagem');
      return null;
    }
    
    console.log('[Dashboard] Campo de imagem encontrado:', imagePath);
    
    // Se já é URL completa
    if (/^https?:\/\//i.test(imagePath)) {
      console.log('[Dashboard] Já é URL completa:', imagePath);
      return imagePath;
    }
    
    // Construir URL com backend
    const backendBaseUrl = getBackendUrl()?.replace(/\/$/, "");
    
    // Normalizar path
    const normalized = imagePath.replace(/\\/g, "/");
    const publicIndex = normalized.indexOf("/public/");
    let relativePath = normalized;
    
    if (publicIndex >= 0) {
      relativePath = normalized.slice(publicIndex + 1);
    } else {
      relativePath = normalized.replace(/^\/+/, "");
      if (!relativePath.startsWith("public/")) {
        relativePath = `public/${relativePath}`;
      }
    }
    
    const finalUrl = backendBaseUrl ? `${backendBaseUrl}/${relativePath}` : `/${relativePath}`;
    console.log('[Dashboard] URL final construída:', finalUrl);
    return finalUrl;
  };

  const calcTrend = (current, previous) => {
    if (!previous || previous === 0) return { isUp: true, value: 0 };
    const diff = ((current - previous) / previous) * 100;
    return {
      isUp: diff >= 0,
      value: Math.abs(diff).toFixed(1)
    };
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes < 1) return '00h 01m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  // Simple CSS Bar Chart
  const SimpleBarChart = ({ data, labels, colors }) => {
    const maxValue = Math.max(...data, 1);
    
    return (
      <div className={classes.simpleBarChart}>
        {data.map((value, index) => (
          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className={classes.bar}
              style={{
                height: `${(value / maxValue) * 100}%`,
                background: colors?.[index] || '#3b82f6',
                minHeight: 4,
              }}
              title={`${labels[index]}: ${value}`}
            />
            <div className={classes.barLabel}>{labels[index]}</div>
          </div>
        ))}
      </div>
    );
  };

  // Simple CSS Donut Chart
  const SimpleDonutChart = ({ data, labels, colors }) => {
    const total = data.reduce((a, b) => a + b, 0);
    let currentAngle = 0;
    const gradientStops = data.map((value, index) => {
      const percentage = (value / total) * 100;
      const angle = (percentage / 100) * 360;
      const stop = `${colors[index]} ${currentAngle}deg ${currentAngle + angle}deg`;
      currentAngle += angle;
      return stop;
    }).join(', ');

    return (
      <div>
        <div
          className={classes.simpleDonut}
          style={{
            background: `conic-gradient(${gradientStops})`,
          }}
        />
        <div className={classes.donutLegend}>
          {labels.map((label, index) => (
            <div key={index} className={classes.legendItem}>
              <div className={classes.legendColor} style={{ background: colors[index] }} />
              <span>{label}: {data[index]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={classes.loadingContainer}>
        <CircularProgress />
      </div>
    );
  }

  const hasSlides = sliderBanners.length > 0;

  return (
    <div className={classes.container}>
      {/* Header */}
      <div className={classes.header}>
        <Typography className={classes.headerTitle}>Dashboard</Typography>
        <Typography className={classes.headerSubtitle}>
          Bem-vindo, {user?.name || 'Usuário'}
        </Typography>
      </div>

      {/* Banner Slider */}
      {hasSlides && (
        <div className={classes.bannerSlider}>
          {sliderBanners[currentSlide] && buildBannerImageUrl(sliderBanners[currentSlide]) ? (
            <img
              key={`banner-${currentSlide}`}
              src={buildBannerImageUrl(sliderBanners[currentSlide])}
              alt={sliderBanners[currentSlide].name || `Banner ${currentSlide + 1}`}
              className={classes.bannerImage}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 24,
              fontWeight: 600
            }}>
              {sliderBanners[currentSlide]?.name || 'Bem-vindo ao AtendZappy'}
            </div>
          )}
          
          {sliderBanners.length > 1 && (
            <>
              <div 
                className={`${classes.bannerArrow} ${classes.bannerArrowLeft}`}
                onClick={handlePrevSlide}
              >
                <ArrowBackIos style={{ fontSize: 18, marginLeft: 4 }} />
              </div>
              <div 
                className={`${classes.bannerArrow} ${classes.bannerArrowRight}`}
                onClick={handleNextSlide}
              >
                <ArrowForwardIos style={{ fontSize: 18 }} />
              </div>
              
              <div className={classes.bannerDots}>
                {sliderBanners.map((_, index) => (
                  <div
                    key={index}
                    className={`${classes.bannerDot} ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Plan Info Cards */}
      <Grid container spacing={2} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <DashboardIcon style={{ fontSize: 20, color: "#3b82f6" }} />
                <Typography className={classes.indicatorLabel}>Plano Atual</Typography>
              </Box>
              <Typography className={classes.indicatorValue}>
                {companyPlan.planName || "Sem plano"}
              </Typography>
              {companyPlan.trial && companyPlan.trialEndDate && moment(companyPlan.trialEndDate).isAfter(moment()) && (
                <Chip
                  label="Período de teste"
                  size="small"
                  style={{ 
                    alignSelf: "flex-start", 
                    fontWeight: 600, 
                    fontSize: 10,
                    background: "#fef3c7",
                    color: "#d97706"
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Event style={{ fontSize: 20, color: "#10b981" }} />
                <Typography className={classes.indicatorLabel}>Início do Contrato</Typography>
              </Box>
              <Typography className={classes.indicatorValue}>
                {companyPlan.startDate
                  ? moment(companyPlan.startDate).format("DD/MM/YYYY")
                  : "--/--/----"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Event style={{ fontSize: 20, color: "#ef4444" }} />
                <Typography className={classes.indicatorLabel}>Vencimento</Typography>
              </Box>
              <Typography className={classes.indicatorValue}>
                {companyPlan.dueDate
                  ? moment(companyPlan.dueDate).format("DD/MM/YYYY")
                  : "--/--/----"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Loop style={{ fontSize: 20, color: "#8b5cf6" }} />
                <Typography className={classes.indicatorLabel}>Recorrência</Typography>
              </Box>
              <Typography className={classes.indicatorValue}>
                {companyPlan.recurrence === "MENSAL"
                  ? "Mensal"
                  : companyPlan.recurrence === "TRIMESTRAL"
                  ? "Trimestral"
                  : companyPlan.recurrence === "SEMESTRAL"
                  ? "Semestral"
                  : companyPlan.recurrence || "—"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dashboard Metrics */}
      <Typography className={classes.sectionTitle}>Métricas Principais</Typography>

      <Grid container spacing={2} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Typography className={classes.indicatorLabel}>Tickets Finalizados</Typography>
              <Typography className={classes.indicatorValue}>
                {dashboardData?.counters?.supportFinished?.toLocaleString("pt-BR") || "0"}
              </Typography>
              {dashboardData?.counters?.supportFinished > 0 && (
                <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                  <ArrowUpward style={{ fontSize: 14, color: "#10b981" }} />
                  <Typography style={{ fontSize: 12, color: "#10b981" }}>
                    Período selecionado
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Typography className={classes.indicatorLabel}>Tickets Pendentes</Typography>
              <Typography className={classes.indicatorValue}>
                {dashboardData?.counters?.supportPending?.toLocaleString("pt-BR") || "0"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Typography className={classes.indicatorLabel}>Em Atendimento</Typography>
              <Typography className={classes.indicatorValue}>
                {dashboardData?.counters?.supportHappening?.toLocaleString("pt-BR") || "0"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.indicatorCard}>
            <CardContent>
              <Typography className={classes.indicatorLabel}>Tempo Médio Espera</Typography>
              <Typography className={classes.indicatorValue}>
                {dashboardData?.counters?.avgWaitTime 
                  ? formatTime(dashboardData.counters.avgWaitTime)
                  : "--"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Simple Charts Section */}
      <Typography className={classes.sectionTitle}>Gráficos</Typography>

      <Grid container spacing={2} style={{ marginBottom: 24 }}>
        {/* Tags Distribution */}
        <Grid item xs={12} md={6}>
          <Card className={classes.chartCard}>
            <div className={classes.chartHeader}>
              <Typography className={classes.chartTitle}>Contatos por Tag</Typography>
            </div>
            <SimpleDonutChart
              data={[120, 85, 65, 45]}
              labels={['Lead Quente', 'Cliente VIP', 'Em negociação', 'Prospect']}
              colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
            />
          </Card>
        </Grid>

        {/* Contacts by State */}
        <Grid item xs={12} md={6}>
          <Card className={classes.chartCard}>
            <div className={classes.chartHeader}>
              <Typography className={classes.chartTitle}>Top Estados</Typography>
            </div>
            <div className={classes.simpleGrid}>
              {[
                { state: 'SP', count: 45 },
                { state: 'RJ', count: 32 },
                { state: 'MG', count: 28 },
                { state: 'RS', count: 22 },
                { state: 'PR', count: 18 },
                { state: 'SC', count: 15 },
                { state: 'BA', count: 12 },
                { state: 'PE', count: 10 },
              ].map((state, index) => (
                <div key={index} className={classes.gridItem}>
                  <div className={classes.gridItemLabel}>{state.state}</div>
                  <div className={classes.gridItemValue}>{state.count}</div>
                </div>
              ))}
            </div>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;
