import { useState } from 'react';
import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import AboutCard from '../components/AboutCard';
import BackupsCard from '../components/BackupsCard';
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 720 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {settings && <BusinessForm settings={settings} onSave={save} onSaved={() => setMessage('Datos guardados')} />}

        <BackupsCard onMessage={setMessage} />
        <ChangePasswordForm onChanged={() => setMessage('Contraseña actualizada')} />
        <AboutCard version={version} onMessage={setMessage} />
      </Box>

      <Snackbar open={Boolean(message)} autoHideDuration={3500} onClose={() => setMessage(null)}>
        <Alert severity="success">{message}</Alert>
      </Snackbar>
    </>
  );
}
