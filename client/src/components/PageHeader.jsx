import { Box, Typography, alpha, useTheme } from '@mui/material';
import { getSection } from '../theme/sections';

// Encabezado de página: ícono con el color de la sección, título y acciones a la derecha.
export default function PageHeader({ sectionKey, title, actions }) {
  const theme = useTheme();
  const section = getSection(sectionKey);
  const color = theme.palette.sections[sectionKey];
  const Icon = section?.icon;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
      {Icon && (
        <Box
          sx={{
            width: 42,
            height: 42,
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
      )}
      <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
        {title}
      </Typography>
      {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>{actions}</Box>}
    </Box>
  );
}
