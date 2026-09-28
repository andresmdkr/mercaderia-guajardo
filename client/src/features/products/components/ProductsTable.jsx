import {
  Chip,
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
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';
import { formatMoney } from '../../../utils/format';

export default function ProductsTable({ items, total, page, pageSize, onPageChange, onEdit, onToggleActive }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell align="right">Venta</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Mínimo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No hay productos para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category ?? '—'}</TableCell>
                <TableCell align="right">{formatMoney(product.costPrice)}</TableCell>
                <TableCell align="right">{formatMoney(product.salePrice)}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={product.stock}
                    color={product.stock <= product.minStock ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">{product.minStock}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => onEdit(product)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={product.active ? 'Dar de baja' : 'Reactivar'}>
                    <IconButton size="small" onClick={() => onToggleActive(product)}>
                      {product.active ? <BlockIcon fontSize="small" /> : <RestoreIcon fontSize="small" />}
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
