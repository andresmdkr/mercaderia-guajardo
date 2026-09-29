import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Grid, Paper, Typography, alpha, useTheme } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCartOutlined';
import ExternalBackupWarning from '../features/settings/components/ExternalBackupWarning';
import { flatSections } from '../theme/sections';

function IconBox({ icon: Icon, color, size = 44 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        bgcolor: alpha(color, 0.14),
      }}
    >
      <Icon />
    </Box>
  );
}

// Ventas es lo más importante: tarjeta grande y destacada.
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
        gap: 3,
        flexWrap: 'wrap',
        p: 3,
        mb: 3,
        color: 'inherit',
        textDecoration: 'none',
        borderColor: color,
        bgcolor: alpha(color, 0.07),
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: alpha(color, 0.13) },
      }}
    >
      <IconBox icon={AddShoppingCartIcon} color={color} size={56} />
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

function SectionCard({ section }) {
  const theme = useTheme();
  const color = theme.palette.sections[section.key];

  return (
    <Paper
      component={RouterLink}
      to={section.path}
      sx={{
        display: 'block',
        p: 3,
        height: '100%',
        color: 'inherit',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        '&:hover': { borderColor: color, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <IconBox icon={section.icon} color={color} />
      </Box>
      <Typography variant="h6" gutterBottom>
        {section.label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {section.description}
      </Typography>
    </Paper>
  );
}

export default function Home() {
  const user = useSelector((state) => state.session.user);

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Hola, {user?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        ¿Qué querés hacer hoy?
      </Typography>

      <ExternalBackupWarning />

      <NewSaleCard />

      <Grid container spacing={2}>
        {flatSections
          .filter((section) => section.key !== 'home')
          .map((section) => (
            <Grid key={section.key} size={{ xs: 12, sm: 6, md: 4 }}>
              <SectionCard section={section} />
            </Grid>
          ))}
      </Grid>
    </>
  );
}
