import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  CircularProgress,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from "@material-ui/core";
import {
  Assignment,
  People,
  LocalOffer,
  AccessTime,
  CheckCircle,
  Schedule,
  WhatsApp,
  TrendingUp,
  TrendingDown,
  Star,
  AttachMoney,
  Receipt,
  ShoppingCart,
  Refresh,
} from "@material-ui/icons";
import moment from "moment";
import { toast } from "react-toastify";
import useDashboard from "../../hooks/useDashboard";

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
  tabsContainer: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(1),
    marginBottom: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  tab: {
    minWidth: 'auto',
    padding: theme.spacing(1, 2),
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'none',
    borderRadius: 8,
    marginRight: theme.spacing(0.5),
    '&:hover': {
      background: '#f3f4f6',
    },
  },
  filtersContainer: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    flexWrap: 'wrap',
  },
  indicatorCard: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    height: '100%',
  },
  indicatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1),
  },
  indicatorContent: {
    flex: 1,
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
  chartCard: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    height: '100%',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: theme.spacing(2),
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
    minHeight: 4,
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
    width: 180,
    height: 180,
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
  tableCard: {
    background: '#fff',
    borderRadius: 12,
    padding: theme.spacing(2),
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
  },
  tableHeader: {
    background: '#f8fafc',
  },
  tableRow: {
    '&:hover': {
      background: '#f8fafc',
    },
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid #fff',
  },
  attendantAvatar: {
    width: 40,
    height: 40,
    marginRight: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
}));

const Reports = () => {
  const classes = useStyles();
  const { getReport } = useDashboard();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dateFrom, setDateFrom] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadReportData();
  }, [dateFrom, dateTo]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateFrom,
        endDate: dateTo,
      };
      const data = await getReport(params);
      console.log('[Relatórios] Dados recebidos:', data);
      setReportData(data);
    } catch (error) {
      console.error('[Relatórios] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReportData();
  };

  // Dados reais ou fallback
  const counters = reportData?.counters || {
    supportFinished: 0,
    leads: 0,
    avgWaitTime: 0,
    supportHappening: 0,
    supportPending: 0,
    npsPromotersPerc: 0,
    npsPassivePerc: 0,
    npsDetractorsPerc: 0,
    tickets: 0,
  };
  
  // Para cálculo de tendência, podemos usar dados anteriores se disponíveis
  const previousCounters = {
    supportFinished: counters.supportFinished || 0,
    leads: counters.leads || 0,
  };
  
  const attendants = reportData?.attendants || [];
  const tags = reportData?.tagsContactsSummary || [];
  const whatsappConnections = []; // Não disponível neste endpoint
  const products = []; // Não disponível neste endpoint
  const invoices = []; // Não disponível neste endpoint

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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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

  const IndicatorCard = ({ icon, iconBg, label, value, trend, trendValue, classes: styles }) => (
    <div className={styles.indicatorCard}>
      <div className={styles.indicatorIcon} style={{ background: iconBg }}>
        {icon}
      </div>
      <div className={styles.indicatorContent}>
        <Typography className={styles.indicatorLabel}>{label}</Typography>
        <Typography className={styles.indicatorValue}>{value}</Typography>
        {trend !== undefined && (
          <div className={`${styles.indicatorTrend} ${trend ? styles.trendUp : styles.trendDown}`}>
            {trend ? <TrendingUp style={{ fontSize: 14 }} /> : <TrendingDown style={{ fontSize: 14 }} />}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={classes.loadingContainer}>
        <CircularProgress />
      </div>
    );
  }

  const tabLabels = [
    'Visão Geral',
    'Atendentes',
    'Tags',
    'Canais',
    'Produtos',
    'Faturas',
  ];

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <Typography className={classes.headerTitle}>Relatórios</Typography>
        <Typography className={classes.headerSubtitle}>
          Análise detalhada do seu negócio
        </Typography>
      </div>

      <div className={classes.tabsContainer}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} className={classes.tab} />
          ))}
        </Tabs>
      </div>

      <div className={classes.filtersContainer}>
        <TextField
          label="Data Inicial"
          type="date"
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          label="Data Final"
          type="date"
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <Tooltip title="Atualizar dados">
          <IconButton onClick={handleRefresh} size="small" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </div>

      {activeTab === 0 && (
        <>
          <Grid container spacing={2} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<Assignment style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#3b82f6"
                label="Total de Tickets"
                value={counters.supportFinished || 0}
                trend={calcTrend(counters.supportFinished, previousCounters.supportFinished).isUp}
                trendValue={`${calcTrend(counters.supportFinished, previousCounters.supportFinished).value}% vs período anterior`}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<People style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#10b981"
                label="Novos Leads"
                value={counters.leads || 0}
                trend={calcTrend(counters.leads, previousCounters.leads).isUp}
                trendValue={`${calcTrend(counters.leads, previousCounters.leads).value}% vs período anterior`}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<AccessTime style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#f59e0b"
                label="Tempo Médio de Espera"
                value={formatTime(counters.avgWaitTime)}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<CheckCircle style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#8b5cf6"
                label="Em Atendimento"
                value={counters.supportHappening || 0}
                classes={classes}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card className={classes.chartCard}>
                <Typography className={classes.chartTitle}>Distribuição de Status</Typography>
                <SimpleDonutChart
                  data={[counters.supportFinished, counters.supportHappening, counters.leads]}
                  labels={['Finalizados', 'Em Atendimento', 'Leads']}
                  colors={['#10b981', '#3b82f6', '#f59e0b']}
                />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card className={classes.chartCard}>
                <Typography className={classes.chartTitle}>Avaliações (NPS)</Typography>
                <SimpleDonutChart
                  data={[counters.npsPromotersPerc, counters.npsPassivePerc, counters.npsDetractorsPerc]}
                  labels={['Promotores', 'Neutros', 'Detratores']}
                  colors={['#10b981', '#f59e0b', '#ef4444']}
                />
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Grid container spacing={2} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<People style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#3b82f6"
                label="Total de Atendentes"
                value={attendants.length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<CheckCircle style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#10b981"
                label="Online Agora"
                value={attendants.filter(a => a.online).length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<Assignment style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#f59e0b"
                label="Total de Atendimentos"
                value={attendants.reduce((acc, a) => acc + (a.tickets || 0), 0)}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<AccessTime style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#8b5cf6"
                label="Média de Avaliação"
                value={attendants.length > 0 
                  ? (attendants.reduce((acc, a) => acc + (parseFloat(a.rating) || 0), 0) / attendants.length).toFixed(1)
                  : '0'}
                classes={classes}
              />
            </Grid>
          </Grid>

          <Card className={classes.chartCard} style={{ marginBottom: 24 }}>
            <Typography className={classes.chartTitle}>Atendimentos por Atendente</Typography>
            <SimpleBarChart
              data={attendants.slice(0, 5).map(a => a.tickets || 0)}
              labels={attendants.slice(0, 5).map(a => a.name)}
              colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
            />
          </Card>

          <Card className={classes.tableCard}>
            <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
              Detalhamento por Atendente
            </Typography>
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Atendimentos</TableCell>
                  <TableCell align="center">Avaliação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendants.map((attendant) => (
                  <TableRow key={attendant.id} className={classes.tableRow}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box position="relative">
                          <Avatar className={classes.attendantAvatar}>
                            {attendant.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <div 
                            className={classes.onlineIndicator}
                            style={{ background: attendant.online ? '#10b981' : '#9ca3af' }}
                          />
                        </Box>
                        <Typography style={{ fontWeight: 500 }}>{attendant.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: attendant.online ? '#d1fae5' : '#f3f4f6',
                          color: attendant.online ? '#065f46' : '#6b7280',
                        }}
                      >
                        {attendant.online ? 'Online' : 'Offline'}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{attendant.tickets || 0}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Star style={{ fontSize: 16, color: '#f59e0b' }} />
                        <span style={{ fontWeight: 600 }}>{parseFloat(attendant.rating || 0).toFixed(1)}</span>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 2 && (
        <>
          <Grid container spacing={2} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<LocalOffer style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#3b82f6"
                label="Total de Tags"
                value={tags.length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<People style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#10b981"
                label="Contatos com Tags"
                value={tags.reduce((acc, t) => acc + (t.contactsCount || 0), 0)}
                classes={classes}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card className={classes.chartCard}>
                <Typography className={classes.chartTitle}>Distribuição por Tag</Typography>
                <SimpleDonutChart
                  data={tags.slice(0, 5).map(t => t.contactsCount)}
                  labels={tags.slice(0, 5).map(t => t.name)}
                  colors={tags.slice(0, 5).map(t => t.color || '#3b82f6')}
                />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card className={classes.chartCard}>
                <Typography className={classes.chartTitle}>Top Tags</Typography>
                <SimpleBarChart
                  data={tags.slice(0, 5).map(t => t.contactsCount)}
                  labels={tags.slice(0, 5).map(t => t.name)}
                  colors={tags.slice(0, 5).map(t => t.color || '#3b82f6')}
                />
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 3 && (
        <>
          <Grid container spacing={2} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<WhatsApp style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#25D366"
                label="Conexões WhatsApp"
                value={whatsappConnections.length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<CheckCircle style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#10b981"
                label="Canais Ativos"
                value={whatsappConnections.filter(w => w.status === 'CONNECTED').length}
                classes={classes}
              />
            </Grid>
          </Grid>

          <Card className={classes.tableCard}>
            <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
              Conexões WhatsApp
            </Typography>
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Número</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {whatsappConnections.map((conn) => (
                  <TableRow key={conn.id} className={classes.tableRow}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <WhatsApp style={{ color: '#25D366', marginRight: 8 }} />
                        <Typography style={{ fontWeight: 500 }}>{conn.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: conn.status === 'CONNECTED' ? '#d1fae5' : '#fee2e2',
                          color: conn.status === 'CONNECTED' ? '#065f46' : '#991b1b',
                        }}
                      >
                        {conn.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                      </Box>
                    </TableCell>
                    <TableCell>{conn.number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 4 && (
        <>
          <Grid container spacing={2} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<ShoppingCart style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#f97316"
                label="Total de Produtos"
                value={products.length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<CheckCircle style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#10b981"
                label="Disponíveis"
                value={products.filter(p => p.status === 'disponivel').length}
                classes={classes}
              />
            </Grid>
          </Grid>

          <Card className={classes.tableCard}>
            <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
              Catálogo de Produtos
            </Typography>
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="right">Preço</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className={classes.tableRow}>
                    <TableCell style={{ fontWeight: 500 }}>{product.nome}</TableCell>
                    <TableCell align="right" style={{ fontWeight: 600 }}>
                      {formatCurrency(product.valor)}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: product.status === 'disponivel' ? '#d1fae5' : '#fee2e2',
                          color: product.status === 'disponivel' ? '#065f46' : '#991b1b',
                        }}
                      >
                        {product.status === 'disponivel' ? 'Disponível' : 'Indisponível'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 5 && (
        <>
          <Grid container spacing={2} style={{ marginBottom: 24 }}>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<Receipt style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#3b82f6"
                label="Total de Faturas"
                value={invoices.length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<CheckCircle style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#10b981"
                label="Faturas Pagas"
                value={invoices.filter(i => i.status === 'paid').length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<Schedule style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#f59e0b"
                label="Faturas Pendentes"
                value={invoices.filter(i => i.status === 'pending').length}
                classes={classes}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <IndicatorCard
                icon={<AttachMoney style={{ color: '#fff', fontSize: 28 }} />}
                iconBg="#8b5cf6"
                label="Valor Total"
                value={formatCurrency(invoices.reduce((acc, i) => acc + (i.valor || 0), 0))}
                classes={classes}
              />
            </Grid>
          </Grid>

          <Card className={classes.tableCard}>
            <Typography className={classes.chartTitle} style={{ marginBottom: 16 }}>
              Faturas do Período
            </Typography>
            <Table>
              <TableHead className={classes.tableHeader}>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className={classes.tableRow}>
                    <TableCell>#{invoice.id}</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>
                      {formatCurrency(invoice.valor)}
                    </TableCell>
                    <TableCell>
                      {moment(invoice.dataVencimento).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        component="span"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: invoice.status === 'paid' ? '#d1fae5' : '#fee2e2',
                          color: invoice.status === 'paid' ? '#065f46' : '#991b1b',
                        }}
                      >
                        {invoice.status === 'paid' ? 'Paga' : 'Pendente'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
