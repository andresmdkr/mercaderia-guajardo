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
import SortableHeaderCell from '../../../components/SortableHeaderCell';
import { formatMoney } from '../../../utils/format';

// Hacer clic en una fila abre el producto para editarlo (o darlo de baja).
export default function ProductsTable({ items, total, page, pageSize, onPageChange, onEdit, sort, onSort }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableHeaderCell field="code" sort={sort} onSort={onSort}>
                Código
              </SortableHeaderCell>
              <SortableHeaderCell field="name" sort={sort} onSort={onSort}>
                Nombre
              </SortableHeaderCell>
              <SortableHeaderCell field="category" sort={sort} onSort={onSort}>
                Categoría
              </SortableHeaderCell>
              <SortableHeaderCell field="costPrice" sort={sort} onSort={onSort} align="right">
                Costo
              </SortableHeaderCell>
              <SortableHeaderCell field="salePrice" sort={sort} onSort={onSort} align="right">
                Venta
              </SortableHeaderCell>
              <SortableHeaderCell field="stock" sort={sort} onSort={onSort} align="right">
                Stock
              </SortableHeaderCell>
              <SortableHeaderCell field="minStock" sort={sort} onSort={onSort} align="right">
                Mínimo
              </SortableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No hay productos para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((product) => (
              <TableRow key={product.id} hover onClick={() => onEdit(product)} sx={{ cursor: 'pointer' }}>
                <TableCell>{product.code}</TableCell>
                <TableCell>
                  {product.name}
                  {!product.active && <Chip size="small" label="De baja" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{product.category?.name ?? '—'}</TableCell>
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
