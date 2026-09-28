import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { getErrorMessage } from '../../../services/api';
import { formatSaleNumber } from '../../../utils/format';

// Pide confirmación (y un motivo opcional) antes de anular una venta.
export default function VoidSaleDialog({ sale, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onCancel} fullWidth maxWidth="xs">
      <DialogTitle>Anular venta {formatSaleNumber(sale.id)}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Se devuelve el stock de los productos vendidos. Esta acción no se puede deshacer: si te equivocaste, hacé una venta nueva.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Motivo (opcional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          fullWidth
          size="small"
          autoFocus
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          Volver
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={saving}>
          Anular venta
        </Button>
      </DialogActions>
    </Dialog>
  );
}
