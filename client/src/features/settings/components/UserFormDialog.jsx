import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { getErrorMessage } from '../../../services/api';

const emptyValues = { name: '', username: '', password: '', repeat: '' };

// Validación para dar feedback rápido; el servidor vuelve a validar todo.
function validate({ name, username, password, repeat }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Obligatorio';
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username.trim())) errors.username = 'De 3 a 50 caracteres: letras, números, punto, guion o guion bajo';
  if (password.length < 8) errors.password = 'Mínimo 8 caracteres';
  else if (password.length > 72) errors.password = 'Máximo 72 caracteres';
  if (repeat !== password) errors.repeat = 'Las contraseñas no coinciden';
  return errors;
}

// Alta de una persona nueva: nombre, usuario con el que va a entrar y su contraseña.
export default function UserFormDialog({ onSave, onClose }) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSave({ name: values.name.trim(), username: values.username.trim(), password: values.password });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setSaving(false);
    }
  };

  const field = (name, label, { help, ...props } = {}) => (
    <TextField label={label} value={values[name]} onChange={handleChange(name)} error={Boolean(errors[name])} helperText={errors[name] ?? help} size="small" fullWidth {...props} />
  );

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" component="form" onSubmit={handleSubmit} noValidate>
      <DialogTitle>Agregar una persona</DialogTitle>
      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {field('name', 'Nombre', { autoFocus: true })}
          {field('username', 'Usuario para entrar', { help: 'Sin espacios. Por ejemplo: ana', autoComplete: 'off' })}
          {field('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' })}
          {field('repeat', 'Repetir contraseña', { type: 'password', autoComplete: 'new-password' })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Agregar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
