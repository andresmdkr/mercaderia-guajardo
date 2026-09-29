import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Grid, Paper, Typography, alpha, useTheme } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCartOutlined';
import LowStockCard from '../features/home/components/LowStockCard';
import QuickLinks from '../features/home/components/QuickLinks';
import RecentSalesCard from '../features/home/components/RecentSalesCard';
import useHomeData from '../features/home/hooks/useHomeData';
import SummaryTiles from '../features/reports/components/SummaryTiles';
import ExternalBackupWarning from '../features/settings/components/ExternalBackupWarning';

const todayLabel = () => new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

// Ventas es lo más importante: tarjeta destacada, siempre a mano.
function NewSaleCard() {
  const theme = useTheme();
  const color = theme.palette.sections.sales;

  return (
    <Paper
      component={RouterLink}
      to="/sales/new"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        flexWrap: 'wrap',
        p: 2.5,
        mb: 4,
        color: 'inherit',
        textDecoration: 'none',
        borderColor: color,
        bgcolor: alpha(color, 0.07),
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: alpha(color, 0.13) },
      }}
    >
      <Box sx={{ display: 'flex', p: 1.5, borderRadius: 2.5, color, bgcolor: alpha(color, 0.14) }}>
        <AddShoppingCartIcon />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 200 }}>
        <Typography variant="h5" component="h2">
          Nueva venta
        </Typography>
        <Typography color="text.secondary">Cargá los productos, aplicá descuentos y el stock se actualiza solo.</Typography>
      </Box>
      <Button
        variant="contained"
        size="large"
        component="span"
        sx={{ bgcolor: color, color: theme.palette.getContrastText(color), '&:hover': { bgcolor: color } }}
      >
        Empezar
      </Button>
    </Paper>
  );
}

// Inicio: cómo viene el día (lo vendido hoy, las últimas ventas y lo que hay que reponer) y accesos a todas las pantallas.
export default function Home() {
  const user = useSelector((state) => state.session.user);
  const { summary, sales, lowStock, loading } = useHomeData();

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Hola, {user?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, '&::first-letter': { textTransform: 'uppercase' } }}>
        {todayLabel()}
      </Typography>

      <ExternalBackupWarning />

      <NewSaleCard />

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Hoy
      </Typography>
      <SummaryTiles summary={summary} loading={loading} />

      <Grid container spacing={2} sx={{ mt: 1, mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <RecentSalesCard sales={sales} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <LowStockCard lowStock={lowStock} />
        </Grid>
      </Grid>

      <QuickLinks />
    </>
  );
}
