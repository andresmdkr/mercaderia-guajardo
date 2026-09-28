import { useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Snackbar, Typography } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import BusinessForm from '../components/BusinessForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import useAppVersion from '../hooks/useAppVersion';
import useBusinessSettings from '../hooks/useBusinessSettings';

export default function SettingsPage() {
  const { settings, error, loading, save } = useBusinessSettings();
  const version = useAppVersion();
  const [message, setMessage] = useState(null);

  return (
    <>
      <PageHeader sectionKey="settings" title="Configuración" />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 560 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {settings && <BusinessForm settings={settings} onSave={save} onSaved={() => setMessage('Datos guardados')} />}

        <ChangePasswordForm onChanged={() => setMessage('Contraseña actualizada')} />

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Acerca de
          </Typography>
          <Typography color="text.secondary">Mercadería Guajardo · Versión {version ?? '—'}</Typography>
        </Paper>
      </Box>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}>
        <Alert severity="success">{message}</Alert>
      </Snackbar>
    </>
  );
}
