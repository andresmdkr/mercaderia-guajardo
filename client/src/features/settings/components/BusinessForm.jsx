import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import { getErrorMessage } from '../../../services/api';
import SettingsCard from './SettingsCard';

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
    <SettingsCard
      component="form"
      onSubmit={handleSubmit}
      icon={StorefrontIcon}
      title="Datos del negocio"
      description="Aparecen en el encabezado de los comprobantes en PDF."
    >

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>{field('name', 'Nombre del negocio', { autoFocus: true })}</Box>
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>{field('address', 'Dirección')}</Box>
        {field('phone', 'Teléfono')}
        {field('email', 'Email', { type: 'email' })}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          <Button type="submit" variant="contained" disabled={saving}>
            Guardar cambios
          </Button>
        </Box>
      </Box>
    </SettingsCard>
  );
}
