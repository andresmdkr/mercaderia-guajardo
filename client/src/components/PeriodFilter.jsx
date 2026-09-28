import { Box, Chip, TextField } from '@mui/material';
import { DATE_PRESETS } from '../utils/dateRange';

const dateFieldProps = { size: 'small', type: 'date', slotProps: { inputLabel: { shrink: true } }, sx: { bgcolor: 'background.paper' } };

// Fila de filtro de período: atajos (Hoy, Semana...) más fechas personalizadas.
export default function PeriodFilter({ period, onPreset, onDate }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
      {Object.entries(DATE_PRESETS).map(([key, label]) => (
        <Chip
          key={key}
          label={label}
          clickable
          color={period.preset === key ? 'primary' : 'default'}
          variant={period.preset === key ? 'filled' : 'outlined'}
          onClick={() => onPreset(key)}
        />
      ))}
      <TextField label="Desde" value={period.from} onChange={(event) => onDate('from', event.target.value)} {...dateFieldProps} />
      <TextField label="Hasta" value={period.to} onChange={(event) => onDate('to', event.target.value)} {...dateFieldProps} />
    </Box>
  );
}
