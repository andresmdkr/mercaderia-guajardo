import { Box, Typography } from '@mui/material';

// Mensaje cuando una lista está vacía: un ícono, qué pasa, y (si corresponde) un botón con lo que se puede hacer.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {Icon && (
        <Box sx={{ display: 'flex', p: 1.5, mb: 0.5, borderRadius: 3, bgcolor: 'action.hover', color: 'text.secondary' }}>
          <Icon />
        </Box>
      )}
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
