import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import FolderIcon from '@mui/icons-material/CreateNewFolderOutlined';
import { getErrorMessage } from '../../../services/api';
import { desktop } from '../../../services/desktop';
import { formatDateTime } from '../../../utils/format';
import { externalWarningText } from '../backupWarnings';

// Copia externa (opcional): cada copia de seguridad se guarda también en otra carpeta (pendrive o nube).
// Es una recomendación: si no se configura, solo se muestra una advertencia.
export default function ExternalBackupCard({ external, onChange, onMessage }) {
  const [typedFolder, setTypedFolder] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const apply = async (folder) => {
    setSaving(true);
    setError(null);
    try {
      await onChange(folder);
      onMessage(folder ? 'Carpeta externa guardada' : 'Copia externa desactivada');
      setTypedFolder('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChoose = async () => {
    const result = await desktop.chooseFolder();
    if (!result.canceled && result.folder) apply(result.folder);
  };

  const warning = externalWarningText(external);

  return (
    <Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Copia externa (recomendada)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Además de guardarse en esta computadora, cada copia se guarda en otra carpeta: un pendrive, o la carpeta de Google Drive o
        Dropbox si la tienen instalada. Si el disco de esta PC falla, tu información sigue a salvo. Es opcional.
      </Typography>

      {warning && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {warning}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {external?.folder && (
        <Typography variant="body2" sx={{ mb: 1.5, wordBreak: 'break-all' }}>
          Carpeta: <strong>{external.folder}</strong>
          <br />
          {external.lastCopyAt ? `Última copia externa: ${formatDateTime(external.lastCopyAt)}` : 'Todavía no se hizo ninguna copia externa.'}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start' }}>
        {desktop ? (
          <Button variant="outlined" startIcon={<FolderIcon />} onClick={handleChoose} disabled={saving}>
            {external?.folder ? 'Cambiar carpeta' : 'Elegir carpeta'}
          </Button>
        ) : (
          <>
            <TextField
              size="small"
              label="Ruta completa de la carpeta"
              value={typedFolder}
              onChange={(event) => setTypedFolder(event.target.value)}
              sx={{ minWidth: 280 }}
            />
            <Button variant="outlined" onClick={() => apply(typedFolder.trim())} disabled={saving || !typedFolder.trim()}>
              Guardar
            </Button>
          </>
        )}
        {external?.folder && (
          <Button color="inherit" onClick={() => apply(null)} disabled={saving}>
            Quitar
          </Button>
        )}
      </Box>
    </Box>
  );
}
