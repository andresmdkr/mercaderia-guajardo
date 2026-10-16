import { Chip } from '@mui/material';
import ArrowDownIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpIcon from '@mui/icons-material/ArrowUpwardOutlined';

const percentFormat = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

// Cuánto sube o baja un precio, en porcentaje: verde si sube, rojo si baja, gris si no cambia.
export default function PriceVariation({ oldPrice, newPrice }) {
  if (oldPrice <= 0) return null;
  const percent = ((newPrice - oldPrice) / oldPrice) * 100;
  if (Math.abs(percent) < 0.05) return <Chip size="small" label="sin cambio" variant="outlined" />;

  const up = percent > 0;
  return (
    <Chip
      size="small"
      color={up ? 'success' : 'error'}
      variant="outlined"
      icon={up ? <ArrowUpIcon /> : <ArrowDownIcon />}
      label={`${up ? '+' : ''}${percentFormat.format(percent)}%`}
      sx={{ fontWeight: 700, minWidth: 84 }}
    />
  );
}
