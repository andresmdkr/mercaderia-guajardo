import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material';
import ActiveToggleButton from '../../../components/ActiveToggleButton';
import { getErrorMessage } from '../../../services/api';
import useDuplicatePhone from '../hooks/useDuplicatePhone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toFormValues(customer) {
  return {
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
    notes: customer?.notes ?? '',
  };
}

// Validación para dar feedback rápido; el backend vuelve a validar todo.
function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Obligatorio';
  if (values.email.trim() && !EMAIL_REGEX.test(values.email.trim())) errors.email = 'Email no válido';
  return errors;
}

// Se monta solo cuando el diálogo está abierto, así el estado arranca limpio cada vez.
export default function CustomerForm({ customer, onClose, onSubmit, onToggleActive }) {
  const [values, setValues] = useState(() => toFormValues(customer));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { duplicate, check: checkPhone } = useDuplicatePhone(customer?.id);

  const handleChange = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: values.address.trim(),
        notes: values.notes.trim(),
      });
    } catch (error) {
      setServerError(getErrorMessage(error));
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
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>{customer ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>{field('name', 'Nombre', { autoFocus: true })}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            {field('phone', 'Teléfono', { onBlur: () => checkPhone(values.phone) })}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{field('email', 'Email', { type: 'email' })}</Grid>
          {duplicate && (
            <Grid size={12}>
              <Alert severity="warning">Ya hay un cliente con este teléfono: {duplicate.name}. Podés guardarlo igual.</Alert>
            </Grid>
          )}
          <Grid size={12}>{field('address', 'Dirección')}</Grid>
          <Grid size={12}>{field('notes', 'Notas', { multiline: true, minRows: 2 })}</Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {customer && (
          <>
            <ActiveToggleButton
              active={customer.active}
              description={`al cliente "${customer.name}"`}
              onToggle={onToggleActive}
              disabled={saving}
            />
            <Box sx={{ flexGrow: 1 }} />
          </>
        )}
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
