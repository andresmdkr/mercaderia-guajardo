import { useState } from 'react';
import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import BusinessForm from '../components/BusinessForm';
import useBusinessSettings from '../hooks/useBusinessSettings';

export default function SettingsPage() {
  const { settings, error, loading, save } = useBusinessSettings();
  const [saved, setSaved] = useState(false);

  return (
    <>
      <PageHeader sectionKey="settings" title="Configuración" />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {settings && <BusinessForm settings={settings} onSave={save} onSaved={() => setSaved(true)} />}

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)}>
        <Alert severity="success">Datos guardados</Alert>
      </Snackbar>
    </>
  );
}
