import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDateTime } from '../../../utils/format';
import { MOVEMENT_TYPES } from '../movementTypes';

export default function MovementsTable({ items, total, page, pageSize, onPageChange }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Usuario</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No hay movimientos para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((movement) => {
              const type = MOVEMENT_TYPES[movement.type] ?? { label: movement.type, color: 'default' };
              return (
                <TableRow key={movement.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell>
                    {movement.product.name}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {movement.product.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={type.label} color={type.color} variant="outlined" />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, color: movement.quantity > 0 ? 'success.main' : 'error.main' }}
                  >
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {movement.stockBefore} → {movement.stockAfter}
                  </TableCell>
                  <TableCell>{movement.reason ?? '—'}</TableCell>
                  <TableCell>{movement.user.name}</TableCell>
                </TableRow>
              );
            })}
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
