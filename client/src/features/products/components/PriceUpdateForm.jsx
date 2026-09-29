import { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { formatMoney } from '../../../utils/format';

const emptyValues = { percent: '', categoryId: '', roundTo: '0', adjustCost: false };

const ROUND_OPTIONS = [
  { value: '0', label: 'Sin redondear' },
  { value: '10', label: 'A $10' },
  { value: '50', label: 'A $50' },
  { value: '100', label: 'A $100' },
  { value: '500', label: 'A $500' },
];

// Formulario de la actualización: cuánto sube o baja, a qué productos y cómo se redondea.
// Al cambiar cualquier dato se descarta la vista previa (ya no corresponde).
export default function PriceUpdateForm({ categories, busy, onPreview, onChange }) {
  const [values, setValues] = useState(emptyValues);
  const [error, setError] = useState(null);

  const set = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: field === 'adjustCost' ? event.target.checked : event.target.value }));
    setError(null);
    onChange();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const percent = Number(values.percent);
    if (values.percent === '' || !Number.isFinite(percent) || percent === 0) return setError('Ingresá un porcentaje distinto de 0 (por ejemplo 10 para subir, -5 para bajar)');
    if (percent <= -100 || percent > 500) return setError('El porcentaje tiene que estar entre -99,99 y 500');
    return onPreview(values);
  };

  const percent = Number(values.percent);
  const example = Number.isFinite(percent) && values.percent !== '' ? Math.round(1000 * (1 + percent / 100) * 100) / 100 : null;

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        1. Elegí el cambio
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        <TextField
          label="Porcentaje"
          value={values.percent}
          onChange={set('percent')}
          type="number"
          size="small"
          autoFocus
          error={Boolean(error)}
          helperText={example === null ? 'Positivo sube, negativo baja' : `Ejemplo: un producto de ${formatMoney(1000)} pasaría a ${formatMoney(example)}`}
          // step "any": con un paso fijo el navegador solo acepta valores a esa distancia del mínimo (7,91 y 8,01, no 8)
          slotProps={{ htmlInput: { step: 'any' } }}
        />
        <TextField select label="Productos" value={values.categoryId} onChange={set('categoryId')} size="small">
          <MenuItem value="">Todos los productos</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              Solo de la categoría {category.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Redondeo del precio de venta" value={values.roundTo} onChange={set('roundTo')} size="small">
          {ROUND_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <FormControlLabel
        sx={{ mt: 1 }}
        control={<Checkbox checked={values.adjustCost} onChange={set('adjustCost')} />}
        label="Aplicar también el mismo porcentaje al precio de costo (cambia la ganancia estimada)"
      />
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" disabled={busy}>
          Ver cómo quedarían los precios
        </Button>
      </Box>
    </Paper>
  );
}
