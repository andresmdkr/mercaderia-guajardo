import { useState } from 'react';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdateAltOutlined';
import { desktop } from '../../../services/desktop';
import useUpdates from '../hooks/useUpdates';

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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Acerca de
      </Typography>
      <Typography color="text.secondary">Mercadería Guajardo · Versión {version ?? '—'}</Typography>

      {updates.available && (
        <>
          <Typography variant="body2" sx={{ mt: 2, minHeight: 22 }}>
            {updates.message || 'La aplicación busca actualizaciones sola cada vez que se abre.'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Button startIcon={<SystemUpdateIcon />} onClick={updates.check} disabled={busy}>
              Buscar actualizaciones
            </Button>
            {updates.status === 'ready' && (
              <Button variant="contained" onClick={updates.install}>
                Instalar y reiniciar
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Si algo no anda bien, copiá el informe de diagnóstico y mandalo para que lo revisemos.
          </Typography>
          <Button startIcon={<ContentCopyIcon />} onClick={handleCopyDiagnostics} disabled={copying}>
            Copiar informe de diagnóstico
          </Button>
        </>
      )}
    </Paper>
  );
}
