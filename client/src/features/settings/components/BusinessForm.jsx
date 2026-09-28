import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { getErrorMessage } from '../../../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Se monta cuando los datos ya están cargados, así el estado inicial sale directo de ellos.
export default function BusinessForm({ settings, onSave, onSaved }) {
  const [values, setValues] = useState({
    name: settings.name ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!values.name.trim()) found.name = 'Obligatorio';
    if (values.email.trim() && !EMAIL_REGEX.test(values.email.trim())) found.email = 'Email no válido';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      await onSave({
        name: values.name.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
      });
      onSaved();
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, extra = {}) => (
    <TextField
      label={label}
      value={values[name]}
      onChange={handleChange(name)}
      error={Boolean(errors[name])}
      helperText={errors[name]}
      fullWidth
      size="small"
      {...extra}
    />
  );

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 560 }}>
      <Typography variant="h6" gutterBottom>
        Datos del negocio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Aparecen en el encabezado de los comprobantes en PDF.
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {field('name', 'Nombre del negocio', { autoFocus: true })}
        {field('address', 'Dirección')}
        {field('phone', 'Teléfono')}
        {field('email', 'Email', { type: 'email' })}
        <Box>
          <Button type="submit" variant="contained" disabled={saving}>
            Guardar cambios
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
