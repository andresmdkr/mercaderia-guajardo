import { Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';
import { flatSections } from '../../../theme/sections';

// Accesos rápidos a todas las pantallas: compactos (ícono + nombre), porque el detalle ya está en el menú.
export default function QuickLinks() {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Ir a
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5 }}>
        {flatSections
          .filter((section) => section.key !== 'home')
          .map((section) => {
            const color = theme.palette.sections[section.key];
            const Icon = section.icon;
            return (
              <Paper
                key={section.key}
                component={RouterLink}
                to={section.path}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  color: 'inherit',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: color },
                }}
              >
                <Box sx={{ display: 'flex', p: 0.75, borderRadius: 2, color, bgcolor: alpha(color, 0.14) }}>
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {section.label}
                </Typography>
              </Paper>
            );
          })}
      </Box>
    </Box>
  );
}
