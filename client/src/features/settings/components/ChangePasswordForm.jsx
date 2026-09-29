import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import { getErrorMessage } from '../../../services/api';
import SettingsCard from './SettingsCard';
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
    <SettingsCard
      component="form"
      onSubmit={handleSubmit}
      noValidate
      icon={LockIcon}
      title="Cambiar contraseña"
      description="Usá una contraseña que no uses en otros lados. Tu sesión sigue abierta después de cambiarla."
    >

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>{field('current', 'Contraseña actual')}</Box>
        {field('next', 'Contraseña nueva')}
        {field('repeat', 'Repetir contraseña nueva')}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          <Button type="submit" variant="contained" disabled={saving}>
            Cambiar contraseña
          </Button>
        </Box>
      </Box>
    </SettingsCard>
  );
}
