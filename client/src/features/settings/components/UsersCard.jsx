import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Box, Button, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { getErrorMessage } from '../../../services/api';
import useUsers from '../hooks/useUsers';
import ResetPasswordDialog from './ResetPasswordDialog';
import SettingsCard from './SettingsCard';
import UserFormDialog from './UserFormDialog';

// Las personas que usan el programa. Todas pueden hacer lo mismo; lo que cada una hace queda a su nombre.
export default function UsersCard({ onMessage }) {
  const me = useSelector((state) => state.session.user);
  const { users, loading, error, add, setActive, resetPassword } = useUsers();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [actionError, setActionError] = useState(null);

  const run = async (action, message) => {
    setActionError(null);
    try {
      await action();
      onMessage(message);
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  return (
    <SettingsCard
      icon={GroupsIcon}
      title="Usuarios"
      description="Cada persona entra con su usuario. Lo que carga o vende queda a su nombre. Todas pueden hacer lo mismo."
    >
      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? actionError}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAdding(true)}>
          Agregar una persona
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} sx={user.active ? undefined : { opacity: 0.6 }}>
                  <TableCell>
                    {user.name}
                    {user.id === me?.id && <Chip size="small" label="vos" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" color={user.active ? 'success' : 'default'} label={user.active ? 'Activo' : 'De baja'} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setResetting(user)}>
                      Cambiar contraseña
                    </Button>
                    {user.active && user.id !== me?.id && (
                      <Button size="small" color="error" onClick={() => setDeactivating(user)}>
                        Dar de baja
                      </Button>
                    )}
                    {!user.active && (
                      <Button size="small" onClick={() => run(() => setActive(user.id, true), `${user.name} puede volver a entrar`)}>
                        Reactivar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Dar de baja no borra nada: sus ventas y movimientos quedan guardados. La persona deja de poder entrar.
      </Typography>

      {adding && (
        <UserFormDialog
          onClose={() => setAdding(false)}
          onSave={async (data) => {
            const created = await add(data);
            setAdding(false);
            onMessage(`${created.name} ya puede entrar con el usuario ${created.username}`);
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onSave={async (password) => {
            await resetPassword(resetting.id, password);
            setResetting(null);
            onMessage(`Contraseña de ${resetting.name} actualizada`);
          }}
        />
      )}
      {deactivating && (
        <ConfirmDialog
          title="Dar de baja"
          message={`${deactivating.name} no va a poder entrar más (y si tiene el programa abierto, se le cierra). Sus ventas y movimientos quedan guardados. Podés reactivarlo cuando quieras.`}
          confirmLabel="Dar de baja"
          onCancel={() => setDeactivating(null)}
          onConfirm={() => {
            const user = deactivating;
            setDeactivating(null);
            run(() => setActive(user.id, false), `${user.name} quedó de baja`);
          }}
        />
      )}
    </SettingsCard>
  );
}
