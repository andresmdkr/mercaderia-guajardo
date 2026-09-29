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
  alpha,
} from '@mui/material';
import TableEmptyRow from '../../../components/TableEmptyRow';
import SortableHeaderCell from '../../../components/SortableHeaderCell';
import { formatMoney } from '../../../utils/format';
import { onEnter } from '../../../utils/keyboard';

// Hacer clic en una fila abre el producto para editarlo (o darlo de baja).
export default function ProductsTable({ items, total, page, pageSize, onPageChange, onEdit, sort, onSort, loading, emptyState }) {
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
              <TableEmptyRow colSpan={7} loading={loading}>
                {emptyState}
              </TableEmptyRow>
            )}
            {items.map((product) => (
              <TableRow
                key={product.id}
                hover
                tabIndex={0}
                onClick={() => onEdit(product)}
                onKeyDown={onEnter(() => onEdit(product))}
                sx={[{ cursor: 'pointer' }, product.stock === 0 && ((theme) => ({ bgcolor: alpha(theme.palette.error.main, 0.07) }))]}
              >
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
                    color={product.stock === 0 ? 'error' : product.stock <= product.minStock ? 'warning' : 'default'}
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
