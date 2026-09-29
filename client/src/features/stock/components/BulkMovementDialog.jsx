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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '../../../services/api';
import ProductPicker from '../../products/components/ProductPicker';
import { MANUAL_TYPES, MOVEMENT_TYPES, REASON_SUGGESTIONS } from '../movementTypes';
import BulkMovementRow from './BulkMovementRow';

const MAX_LINES = 200; // el mismo tope que el servidor

// Validación de un renglón para dar feedback rápido; el backend vuelve a validar todo.
function lineError(type, { product, value }) {
  if (value === '' || !Number.isInteger(Number(value))) return 'Entero';
  if (type === 'adjustment') return Number(value) < 0 ? 'No puede ser negativo' : null;
  if (Number(value) <= 0) return 'Mayor a 0';
  if (type === 'out' && Number(value) > product.stock) return `Hay ${product.stock}`;
  return null;
}

// Se monta solo cuando el diálogo está abierto, así el estado arranca limpio cada vez.
export default function BulkMovementDialog({ onClose, onSubmit }) {
  const [type, setType] = useState('in');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const changeType = (value) => {
    setType(value);
    setLines((current) => current.map((line) => ({ ...line, value: '' }))); // la cantidad significa otra cosa
    setShowErrors(false);
  };

  const addProduct = (product) => {
    if (!product) return;
    if (lines.some((line) => line.product.id === product.id)) {
      setNotice(`"${product.name}" ya está en la lista`);
      return;
    }
    if (lines.length >= MAX_LINES) {
      setNotice(`Un movimiento admite hasta ${MAX_LINES} productos`);
      return;
    }
    setNotice(null);
    setLines((current) => [...current, { product, value: '' }]);
  };

  const setValue = (productId, value) =>
    setLines((current) => current.map((line) => (line.product.id === productId ? { ...line, value } : line)));
  const removeLine = (productId) => setLines((current) => current.filter((line) => line.product.id !== productId));

  const errors = lines.map((line) => lineError(type, line));
  const reasonMissing = type !== 'in' && !reason.trim();
  const isValid = lines.length > 0 && errors.every((error) => !error) && !reasonMissing;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setShowErrors(true);
    if (!isValid) return;

    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        type,
        reason: reason.trim(),
        items: lines.map(({ product, value }) => ({
          productId: product.id,
          ...(type === 'adjustment' ? { newStock: Number(value) } : { quantity: Number(value) }),
        })),
      });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setSaving(false);
    }
  };

  const total = lines.reduce((sum, { value }) => sum + (Number.isInteger(Number(value)) ? Number(value) : 0), 0);
  const count = `${lines.length} ${lines.length === 1 ? 'producto' : 'productos'}`;
  const summary = type === 'adjustment' ? `${count} a contar` : `${count}, ${total} unidades`;

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="md" component="form" onSubmit={handleSubmit}>
      <DialogTitle>Movimiento múltiple de stock</DialogTitle>
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
          onChange={(event, value) => value && changeType(value)}
          sx={{ mt: 1, mb: 2 }}
        >
          {MANUAL_TYPES.map((key) => (
            <ToggleButton key={key} value={key}>
              {MOVEMENT_TYPES[key].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          label={type === 'in' ? 'Motivo (opcional)' : 'Motivo'}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={showErrors && reasonMissing}
          helperText={showErrors && reasonMissing ? 'Obligatorio para salidas y ajustes' : 'Se aplica a todos los productos'}
          fullWidth
          size="small"
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
          {REASON_SUGGESTIONS[type].map((suggestion) => (
            <Chip key={suggestion} size="small" label={suggestion} variant="outlined" onClick={() => setReason(suggestion)} />
          ))}
        </Box>

        <ProductPicker label="Agregar producto (código o nombre)" value={null} onChange={addProduct} clearOnSelect autoFocus />
        {notice && (
          <Typography variant="caption" color="warning.main">
            {notice}
          </Typography>
        )}

        {lines.length > 0 ? (
          <TableContainer sx={{ mt: 2, maxHeight: 340 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Stock actual</TableCell>
                  <TableCell align="right">{type === 'adjustment' ? 'Stock real' : type === 'in' ? 'Entra' : 'Sale'}</TableCell>
                  <TableCell align="right">Queda</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, index) => (
                  <BulkMovementRow
                    key={line.product.id}
                    line={line}
                    type={type}
                    error={showErrors ? errors[index] : null}
                    onChange={(value) => setValue(line.product.id, value)}
                    onRemove={() => removeLine(line.product.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Buscá los productos y agregalos a la lista; después cargás la cantidad de cada uno.
          </Typography>
        )}
        {showErrors && lines.length === 0 && (
          <Typography variant="caption" color="error">
            Agregá al menos un producto
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {lines.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
            {summary}
          </Typography>
        )}
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
