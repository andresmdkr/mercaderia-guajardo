import { Box } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';

// La "marca" de la app (una caja sobre el color principal, igual al ícono del programa): para las pantallas de entrada.
export default function BrandMark({ size = 44, mb = 2 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        mb,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <InventoryIcon sx={{ fontSize: size * 0.55 }} />
    </Box>
  );
}
