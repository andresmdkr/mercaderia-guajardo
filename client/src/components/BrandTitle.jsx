import { Box, Typography } from '@mui/material';
import BrandMark from './BrandMark';

// Título de las pantallas de entrada: el ícono de la app a la izquierda del texto.
export default function BrandTitle({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <BrandMark size={40} mb={0} />
      <Typography variant="h5" component="h1">
        {children}
      </Typography>
    </Box>
  );
}
