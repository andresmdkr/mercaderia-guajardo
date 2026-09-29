import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { whatsappUrl } from '../../../utils/whatsapp';

// Pide el celular al que se manda el comprobante cuando la venta no tiene un cliente con teléfono.
// Se monta solo cuando está abierto. `onSend` recibe el enlace wa.me ya armado.
export default function ReceiptPhoneDialog({ defaultPhone = '', onCancel, onSend }) {
  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const url = whatsappUrl(phone);
    if (!url) {
      setError('Ingresá un celular de 10 dígitos con la característica, por ejemplo 264 458-1305');
      return;
    }
    onSend(url);
  };

  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle>Enviar comprobante por WhatsApp</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>La venta no tiene un cliente con celular. ¿A qué número se lo mandamos?</DialogContentText>
        <TextField
          label="Celular"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setError(null);
          }}
          error={Boolean(error)}
          helperText={error ?? 'Ejemplo: 264 458-1305. Sin la característica se usa 264 (San Juan).'}
          fullWidth
          autoFocus
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained">
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
