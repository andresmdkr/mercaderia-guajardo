import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import AboutCard from '../components/AboutCard';
import BackupsCard from '../components/BackupsCard';
import BusinessForm from '../components/BusinessForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import DemoModeCard from '../components/DemoModeCard';
import WhatsAppCard from '../components/WhatsAppCard';
import useAppVersion from '../hooks/useAppVersion';
import useBusinessSettings from '../hooks/useBusinessSettings';

// Configuración se divide en pestañas (ver settingsMenuItem en theme/sections.js): cada una es una columna de tarjetas iguales.
export default function SettingsPage() {
  const { pathname } = useLocation();
  const { settings, error, loading, save } = useBusinessSettings();
  const version = useAppVersion();
  const [message, setMessage] = useState(null);
  const tab = pathname.replace(/\/$/, '').split('/')[2] ?? 'business'; // /settings/<pestaña>

  return (
    <>
      <PageHeader sectionKey="settings" title="Configuración" />

      <Box sx={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {tab === 'business' && (
          <>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {settings && <BusinessForm settings={settings} onSave={save} onSaved={() => setMessage('Datos guardados')} />}
            <ChangePasswordForm onChanged={() => setMessage('Contraseña actualizada')} />
          </>
        )}
        {tab === 'backups' && <BackupsCard onMessage={setMessage} />}
        {tab === 'whatsapp' && <WhatsAppCard />}
        {tab === 'app' && (
          <>
            <AboutCard version={version} onMessage={setMessage} />
            <DemoModeCard />
          </>
        )}
      </Box>

      <Snackbar open={Boolean(message)} autoHideDuration={3500} onClose={() => setMessage(null)}>
        <Alert severity="success">{message}</Alert>
      </Snackbar>
    </>
  );
}
