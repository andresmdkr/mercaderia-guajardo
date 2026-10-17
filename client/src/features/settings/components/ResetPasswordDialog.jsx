import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { getErrorMessage } from '../../../services/api';

// Cambiar la contraseña de otra persona (por ejemplo, si la olvidó).
export default function ResetPasswordDialog({ user, onSave, onClose }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres');
    if (password.length > 72) return setError('La contraseña admite hasta 72 caracteres');
    if (password !== repeat) return setError('Las contraseñas no coinciden');
    setSaving(true);
    setError(null);
    try {
      await onSave(password);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" component="form" onSubmit={handleSubmit} noValidate>
      <DialogTitle>Nueva contraseña para {user.name}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>Se la tenés que avisar a la persona. Con la contraseña anterior ya no podrá entrar.</DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <TextField label="Contraseña nueva" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" autoFocus size="small" fullWidth />
          <TextField label="Repetir contraseña" type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} autoComplete="new-password" size="small" fullWidth />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Cambiar contraseña
        </Button>
      </DialogActions>
    </Dialog>
  );
}
