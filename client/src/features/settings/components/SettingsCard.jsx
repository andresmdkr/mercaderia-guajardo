import { Box, Paper, Typography, alpha } from '@mui/material';

// Tarjeta de Configuración: todas iguales (ícono, título, una línea que explica y el contenido) para que las
// pantallas se vean como una sola. Acepta las props de Paper (por ejemplo component="form" y onSubmit).
export default function SettingsCard({ icon: Icon, title, description, children, ...paperProps }) {
  return (
    <Paper {...paperProps} sx={{ p: 3, ...paperProps.sx }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
        {Icon && (
          <Box
            sx={(theme) => ({
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
            })}
          >
            <Icon fontSize="small" />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {children}
    </Paper>
  );
}
