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

      {/* Pantalla ancha: datos y contraseña a la izquierda, copias de seguridad a la derecha. Angosta: una debajo de otra. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {settings && <BusinessForm settings={settings} onSave={save} onSaved={() => setMessage('Datos guardados')} />}

        <ChangePasswordForm onChanged={() => setMessage('Contraseña actualizada')} />
        <AboutCard version={version} onMessage={setMessage} />
        </Box>

        <BackupsCard onMessage={setMessage} />
      </Box>

      <Snackbar open={Boolean(message)} autoHideDuration={3500} onClose={() => setMessage(null)}>
        <Alert severity="success">{message}</Alert>
      </Snackbar>
    </>
  );
}
