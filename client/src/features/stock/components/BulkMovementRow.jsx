import { IconButton, TableCell, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { previewStock } from '../movementTypes';

// Un renglón del movimiento múltiple: producto, stock actual, cantidad y cómo queda.
export default function BulkMovementRow({ line, type, error, onChange, onRemove }) {
  const { product, value } = line;
  const isAdjustment = type === 'adjustment';
  const resulting = previewStock(type, product.stock, isAdjustment ? '' : value, isAdjustment ? value : '');
  const showResult = resulting !== null && resulting >= 0;

  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {product.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {product.code}
        </Typography>
      </TableCell>
      <TableCell align="right">{product.stock}</TableCell>
      <TableCell align="right" sx={{ width: 130 }}>
        <TextField
          type="number"
          size="small"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          error={Boolean(error)}
          helperText={error}
          slotProps={{ htmlInput: { min: isAdjustment ? 0 : 1, step: 1, 'aria-label': `Cantidad de ${product.name}` } }}
          sx={{ width: 110 }}
        />
      </TableCell>
      <TableCell align="right">{showResult ? <strong>{resulting}</strong> : '—'}</TableCell>
      <TableCell align="right" padding="checkbox">
        <Tooltip title="Quitar">
          <IconButton size="small" onClick={onRemove} aria-label={`Quitar ${product.name}`}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
