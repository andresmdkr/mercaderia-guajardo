import { useState } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdateAltOutlined';
import { desktop } from '../../../services/desktop';
import useUpdates from '../hooks/useUpdates';
import SettingsCard from './SettingsCard';

// Versión de la app y, en la versión instalada, actualizaciones e informe de diagnóstico.
export default function AboutCard({ version, onMessage }) {
  const updates = useUpdates();
  const [copying, setCopying] = useState(false);
  const busy = updates.status === 'checking' || updates.status === 'downloading';

  const handleCopyDiagnostics = async () => {
    setCopying(true);
    const result = await desktop.copyDiagnostics();
    setCopying(false);
    onMessage(result.ok ? 'Informe copiado. Pegalo donde te lo pidan.' : 'No se pudo copiar el informe');
  };

  return (
    <SettingsCard icon={InfoIcon} title="Acerca de" description={`Mercadería Guajardo · Versión ${version ?? '—'}`}>
      {updates.available ? (
        <>
          <Typography variant="body2" sx={{ minHeight: 22 }}>
            {updates.message || 'La aplicación busca actualizaciones sola cada vez que se abre.'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            <Button startIcon={<SystemUpdateIcon />} onClick={updates.check} disabled={busy}>
              Buscar actualizaciones
            </Button>
            {updates.status === 'ready' && (
              <Button variant="contained" onClick={updates.install}>
                Instalar y reiniciar
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Si algo no anda bien, copiá el informe de diagnóstico y mandalo para que lo revisemos.
          </Typography>
          <Button startIcon={<ContentCopyIcon />} onClick={handleCopyDiagnostics} disabled={copying}>
            Copiar informe de diagnóstico
          </Button>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Estás usando la versión web: las actualizaciones y el informe de diagnóstico son de la aplicación instalada.
        </Typography>
      )}
    </SettingsCard>
  );
}
