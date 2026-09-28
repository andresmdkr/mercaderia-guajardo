import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import { formatMoney } from '../../../utils/format';

export default function CartTable({ lines, onQuantityChange, onRemove }) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="center">Cantidad</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    Escaneá o buscá un producto para empezar la venta
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {lines.map(({ product, quantity }) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.name}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {product.code} · Stock: {product.stock}
                  </Typography>
                </TableCell>
                <TableCell align="right">{formatMoney(product.salePrice)}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" disabled={quantity <= 1} onClick={() => onQuantityChange(product.id, quantity - 1)}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    value={quantity}
                    onChange={(event) => onQuantityChange(product.id, Number(event.target.value))}
                    size="small"
                    type="number"
                    sx={{ width: 68 }}
                    slotProps={{ htmlInput: { min: 1, max: product.stock, style: { textAlign: 'center' } } }}
                  />
                  <Tooltip title={quantity >= product.stock ? `Máximo disponible: ${product.stock}` : ''}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={quantity >= product.stock}
                        onClick={() => onQuantityChange(product.id, quantity + 1)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatMoney(product.salePrice * quantity)}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Quitar">
                    <IconButton size="small" onClick={() => onRemove(product.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
