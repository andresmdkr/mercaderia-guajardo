import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { getErrorMessage } from '../../../services/api';
import { changePasswordRequest } from '../../../services/authService';

const emptyValues = { current: '', next: '', repeat: '' };

// Validación para dar feedback rápido; el backend vuelve a validar todo.
function validate({ current, next, repeat }) {
  const errors = {};
  if (!current) errors.current = 'Obligatorio';
  if (next.length < 8) errors.next = 'Mínimo 8 caracteres';
  else if (next.length > 72) errors.next = 'Máximo 72 caracteres';
  else if (next === current) errors.next = 'Tiene que ser distinta de la actual';
  if (repeat !== next) errors.repeat = 'Las contraseñas no coinciden';
  return errors;
}

export default function ChangePasswordForm({ onChanged }) {
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
      await changePasswordRequest(values.current, values.next);
      setValues(emptyValues);
      onChanged();
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label) => (
    <TextField
      label={label}
      type="password"
      value={values[name]}
      onChange={handleChange(name)}
      error={Boolean(errors[name])}
      helperText={errors[name]}
      autoComplete={name === 'current' ? 'current-password' : 'new-password'}
      fullWidth
      size="small"
    />
  );

  return (
    <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Cambiar contraseña
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Usá una contraseña que no uses en otros lados. Tu sesión sigue abierta después de cambiarla.
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {field('current', 'Contraseña actual')}
        {field('next', 'Contraseña nueva')}
        {field('repeat', 'Repetir contraseña nueva')}
        <Box>
          <Button type="submit" variant="contained" disabled={saving}>
            Cambiar contraseña
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
