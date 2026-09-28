import {
  Box,
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
import CheckIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutlineOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import { formatInteger } from '../../../utils/format';

// El estado lleva ícono y texto, no solo color.
function StockStatus({ stock }) {
  if (stock === 0) return <Chip size="small" color="error" icon={<ErrorIcon />} label="Sin stock" />;
  return <Chip size="small" color="warning" icon={<WarningIcon />} label="Stock bajo" />;
}

// Productos por reponer: primero los más urgentes (los que más faltan para llegar al mínimo).
export default function LowStockTable({ items, total, page, pageSize, onPageChange, loading }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6">Stock bajo</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Productos en su mínimo o por debajo. Es el estado de hoy, no depende del período.
      </Typography>

      {total === 0 && !loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 5, color: 'text.secondary' }}>
          <CheckIcon color="success" />
          <Typography>Todo en orden: ningún producto está por debajo de su mínimo.</Typography>
        </Box>
      ) : (
        <Box sx={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.15s' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Mínimo</TableCell>
                  <TableCell align="right">Faltan</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((product) => {
                  const missing = Math.max(product.minStock - product.stock, 0);
                  return (
                    <TableRow key={product.id} hover>
                      <TableCell>
                        {product.name}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {product.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.category?.name ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatInteger(product.stock)}
                      </TableCell>
                      <TableCell align="right">{formatInteger(product.minStock)}</TableCell>
                      <TableCell align="right">{missing > 0 ? formatInteger(missing) : '—'}</TableCell>
                      <TableCell>
                        <StockStatus stock={product.stock} />
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
        </Box>
      )}
    </Paper>
  );
}
