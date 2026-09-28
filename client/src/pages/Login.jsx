import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import Loader from '../components/Loader';
import ThemeToggle from '../components/ThemeToggle';
import { login } from '../redux/sessionSlice';

export default function Login() {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.session.status);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'checking') return <Loader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await dispatch(login({ username: username.trim(), password }));
    if (login.rejected.match(result)) {
      setError(result.payload ?? 'No se pudo iniciar sesión');
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 4, width: '100%', maxWidth: 380 }}>
        <Typography variant="h5" gutterBottom>
          Mercadería Guajardo
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Iniciá sesión para continuar
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          fullWidth
          autoFocus
          margin="dense"
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          fullWidth
          margin="dense"
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting || !username || !password} sx={{ mt: 2 }}>
          Ingresar
        </Button>
      </Paper>
    </Box>
  );
}
