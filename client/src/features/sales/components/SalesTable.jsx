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
import { formatDateTime, formatMoney, formatSaleNumber } from '../../../utils/format';
import { PAYMENT_METHODS, SALE_STATUSES } from '../salesConstants';

// Hacer clic en una fila abre el detalle de la venta.
export default function SalesTable({ items, total, page, pageSize, onPageChange, onOpen }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>N°</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Pago</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No hay ventas para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((sale) => {
              const status = SALE_STATUSES[sale.status];
              const voided = sale.status === 'voided';
              return (
                <TableRow key={sale.id} hover onClick={() => onOpen(sale)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{formatSaleNumber(sale.id)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(sale.createdAt)}</TableCell>
                  <TableCell>{sale.customer?.name ?? 'Consumidor final'}</TableCell>
                  <TableCell>{PAYMENT_METHODS[sale.paymentMethod]}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, textDecoration: voided ? 'line-through' : 'none', color: voided ? 'text.secondary' : 'inherit' }}
                  >
                    {formatMoney(sale.total)}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={status.label} color={status.color} variant={voided ? 'filled' : 'outlined'} />
                  </TableCell>
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
