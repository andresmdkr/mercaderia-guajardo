import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { formatInteger, formatMoney } from '../../../utils/format';

// Los clientes que más compraron en el período. Las ventas sin cliente asignado se muestran aparte al pie.
export default function TopCustomersTable({ data, loading }) {
  const { items, withoutCustomer } = data;

  return (
    <Paper sx={{ p: 2.5, opacity: loading ? 0.55 : 1, transition: 'opacity 0.15s' }}>
      <Typography variant="h6">Mejores clientes</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ordenados por lo que gastaron en el período.
      </Typography>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          Ninguna venta del período tiene un cliente asignado.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell align="right">Compras</TableCell>
                <TableCell align="right">Total gastado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row, index) => (
                <TableRow key={row.customerId} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{formatInteger(row.salesCount)}</TableCell>
                  <TableCell align="right">{formatMoney(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {withoutCustomer.salesCount > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Además, {formatInteger(withoutCustomer.salesCount)} {withoutCustomer.salesCount === 1 ? 'venta' : 'ventas'} sin cliente
            asignado por {formatMoney(withoutCustomer.total)}.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
