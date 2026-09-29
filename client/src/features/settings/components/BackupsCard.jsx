import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import BackupIcon from '@mui/icons-material/BackupOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpenOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { desktop } from '../../../services/desktop';
import { formatBytes, formatDateTime } from '../../../utils/format';
import { BACKUP_KINDS } from '../backupKinds';
import useBackups from '../hooks/useBackups';

export default function BackupsCard({ onMessage }) {
  const { folder, items, loading, creating, error, create } = useBackups();
  const [restoring, setRestoring] = useState(null); // copia elegida para restaurar (pide confirmación)
  const [restoreError, setRestoreError] = useState(null);

  const handleCreate = async () => {
    if (await create()) onMessage('Copia de seguridad hecha');
  };

  const handleRestore = async () => {
    const backup = restoring;
    setRestoring(null);
    setRestoreError(null);
    const result = await desktop.restoreBackup(backup.name);
    // Si salió bien, la aplicación se reinicia sola y esta ventana se cierra.
    if (!result.ok) setRestoreError(result.message ?? 'No se pudo restaurar la copia');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Copias de seguridad
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Una copia de toda tu información. Se hace una automática por día al abrir la aplicación y se guardan las últimas 30.
        Podés copiar la carpeta a un pendrive para tenerla también fuera de esta computadora.
      </Typography>

      {(error || restoreError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? restoreError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Button variant="contained" startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <BackupIcon />} onClick={handleCreate} disabled={creating}>
          Hacer una copia ahora
        </Button>
        {desktop && (
          <Button startIcon={<FolderOpenIcon />} onClick={() => desktop.openBackupsFolder()}>
            Abrir la carpeta
          </Button>
        )}
      </Box>
      {folder && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, wordBreak: 'break-all' }}>
          Carpeta: {folder}
        </Typography>
      )}

      <TableContainer sx={{ maxHeight: 340 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Tamaño</TableCell>
              {desktop && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={desktop ? 4 : 3} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Todavía no hay copias
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((backup) => {
              const kind = BACKUP_KINDS[backup.kind] ?? { label: backup.kind, color: 'default' };
              return (
                <TableRow key={backup.name} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(backup.createdAt)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={kind.label} color={kind.color} variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatBytes(backup.size)}</TableCell>
                  {desktop && (
                    <TableCell align="right">
                      <Button size="small" startIcon={<RestoreIcon />} onClick={() => setRestoring(backup)}>
                        Restaurar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {restoring && (
        <ConfirmDialog
          title="Restaurar esta copia"
          message={`Se va a reemplazar TODA la información actual por la de la copia del ${formatDateTime(restoring.createdAt)}. Antes se guarda una copia de cómo está ahora, por si te arrepentís. La aplicación se reinicia.`}
          confirmLabel="Restaurar"
          onConfirm={handleRestore}
          onCancel={() => setRestoring(null)}
        />
      )}
    </Paper>
  );
}
