import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import NotesIcon from '@mui/icons-material/StickyNote2Outlined';
import RestoreIcon from '@mui/icons-material/Restore';

export default function CustomersTable({ items, total, page, pageSize, onPageChange, onEdit, onToggleActive }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No hay clientes para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((customer) => (
              <TableRow key={customer.id} hover>
                <TableCell>
                  {customer.name}
                  {customer.notes && (
                    <Tooltip title={customer.notes}>
                      <NotesIcon fontSize="inherit" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{customer.phone ?? '—'}</TableCell>
                <TableCell>{customer.email ?? '—'}</TableCell>
                <TableCell>{customer.address ?? '—'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => onEdit(customer)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={customer.active ? 'Dar de baja' : 'Reactivar'}>
                    <IconButton size="small" onClick={() => onToggleActive(customer)}>
                      {customer.active ? <BlockIcon fontSize="small" /> : <RestoreIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[]}
        onPageChange={(event, newPage) => onPageChange(newPage + 1)}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </Paper>
  );
}
