import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '../../../services/api';
import ProductPicker from '../../products/components/ProductPicker';
import { MANUAL_TYPES, MOVEMENT_TYPES, REASON_SUGGESTIONS, previewStock } from '../movementTypes';

// Validación para dar feedback rápido; el backend vuelve a validar todo.
function validate({ product, type, quantity, newStock, reason }) {
  const errors = {};
  if (!product) errors.product = 'Elegí un producto';

  if (type === 'adjustment') {
    if (newStock === '' || !Number.isInteger(Number(newStock)) || Number(newStock) < 0) errors.newStock = 'Entero de 0 o más';
  } else if (quantity === '' || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
    errors.quantity = 'Entero mayor a 0';
  } else if (type === 'out' && product && Number(quantity) > product.stock) {
    errors.quantity = `Solo hay ${product.stock} en stock`;
  }

  if (type !== 'in' && !reason.trim()) errors.reason = 'Obligatorio para salidas y ajustes';
  return errors;
}

// Se monta solo cuando el diálogo está abierto, así el estado arranca limpio cada vez.
export default function MovementForm({ onClose, onSubmit }) {
  const [product, setProduct] = useState(null);
  const [type, setType] = useState('in');
  const [quantity, setQuantity] = useState('');
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const resultingStock = product ? previewStock(type, product.stock, quantity, newStock) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate({ product, type, quantity, newStock, reason });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        productId: product.id,
        type,
        reason: reason.trim(),
        ...(type === 'adjustment' ? { newStock: Number(newStock) } : { quantity: Number(quantity) }),
      });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>Nuevo movimiento de stock</DialogTitle>
      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={type}
          onChange={(event, value) => value && setType(value)}
          sx={{ mt: 1, mb: 2 }}
        >
          {MANUAL_TYPES.map((key) => (
            <ToggleButton key={key} value={key}>
              {MOVEMENT_TYPES[key].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ProductPicker value={product} onChange={setProduct} autoFocus />
        {errors.product && (
          <Typography variant="caption" color="error">
            {errors.product}
          </Typography>
        )}
        {product && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Stock actual: <strong>{product.stock}</strong>
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          {type === 'adjustment' ? (
            <TextField
              label="Stock real (lo que contaste)"
              type="number"
              value={newStock}
              onChange={(event) => setNewStock(event.target.value)}
              error={Boolean(errors.newStock)}
              helperText={errors.newStock}
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              fullWidth
              size="small"
            />
          ) : (
            <TextField
              label={type === 'in' ? 'Cantidad que entra' : 'Cantidad que sale'}
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              error={Boolean(errors.quantity)}
              helperText={errors.quantity}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              fullWidth
              size="small"
            />
          )}
          {resultingStock !== null && resultingStock >= 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              El stock va a quedar en <strong>{resultingStock}</strong>
            </Typography>
          )}
        </Box>

        <TextField
          label={type === 'in' ? 'Motivo (opcional)' : 'Motivo'}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={Boolean(errors.reason)}
          helperText={errors.reason}
          fullWidth
          size="small"
          sx={{ mt: 2 }}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {REASON_SUGGESTIONS[type].map((suggestion) => (
            <Chip key={suggestion} size="small" label={suggestion} variant="outlined" onClick={() => setReason(suggestion)} />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
