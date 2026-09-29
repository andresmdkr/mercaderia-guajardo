import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Alert, Button, TextField, Typography } from '@mui/material';
import { setup } from '../redux/sessionSlice';
import BrandTitle from './BrandTitle';

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,50}$/;

// Validación para dar feedback rápido; el backend vuelve a validar todo.
function validate({ name, username, password, repeat }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Obligatorio';
  if (!USERNAME_REGEX.test(username.trim())) errors.username = '3 a 50 caracteres: letras, números, punto, guion';
  if (password.length < 8) errors.password = 'Mínimo 8 caracteres';
  else if (password.length > 72) errors.password = 'Máximo 72 caracteres';
  if (repeat !== password) errors.repeat = 'Las contraseñas no coinciden';
  return errors;
}

// Pantalla del primer uso: la app recién instalada todavía no tiene ningún usuario.
export default function SetupForm() {
  const dispatch = useDispatch();
  const [values, setValues] = useState({ name: '', username: '', password: '', repeat: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    const result = await dispatch(
      setup({ name: values.name.trim(), username: values.username.trim(), password: values.password })
    );
    if (setup.rejected.match(result)) {
      setServerError(result.payload ?? 'No se pudo crear el usuario');
      setSubmitting(false);
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
      margin="dense"
      {...extra}
    />
  );

  return (
    <>
      <BrandTitle>¡Bienvenido/a!</BrandTitle>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Creá el usuario administrador para empezar a usar la aplicación.
      </Typography>
      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate>
        {field('name', 'Tu nombre', { autoFocus: true })}
        {field('username', 'Usuario')}
        {field('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' })}
        {field('repeat', 'Repetir contraseña', { type: 'password', autoComplete: 'new-password' })}
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          Crear usuario y empezar
        </Button>
      </form>
    </>
  );
}
