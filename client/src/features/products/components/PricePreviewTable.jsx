import { Alert, Box, Button, Chip, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { formatInteger, formatMoney } from '../../../utils/format';
import PriceCell from './PriceCell';

// Vista previa: cómo quedarían los precios. Todavía no se cambió nada.
// El "Precio nuevo" se puede escribir a mano para fijar un precio exacto en un producto.
export default function PricePreviewTable({ preview, showCost, busy, onApply, onOverride }) {
  const { count, unchanged, items, truncated } = preview;
  const hasManual = items.some((item) => item.manual);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        2. Revisá los cambios
      </Typography>

      {count === 0 && !hasManual && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Con esos valores ningún precio cambia (por el redondeo o porque el porcentaje es muy chico). Igual podés escribir un precio a mano abajo.
        </Alert>
      )}

      <Typography sx={{ mb: 0.5 }}>
        Se van a cambiar los precios de <strong>{formatInteger(count)}</strong> {count === 1 ? 'producto' : 'productos'}
        {unchanged > 0 && ` (${formatInteger(unchanged)} no cambian)`}. Todavía no se modificó nada.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Si querés un precio exacto en algún producto, escribilo en la columna <strong>Precio nuevo</strong> y apretá Enter.
      </Typography>

      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Precio actual</TableCell>
              <TableCell align="right">Precio nuevo</TableCell>
              {showCost && <TableCell align="right">Costo actual</TableCell>}
              {showCost && <TableCell align="right">Costo nuevo</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  {item.name}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {item.code}
                  </Typography>
                </TableCell>
                <TableCell align="right">{formatMoney(item.oldPrice)}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {item.manual && (
                      <Tooltip title="Volver al precio calculado">
                        <span>
                          <IconButton size="small" aria-label={`Volver al precio calculado de ${item.name}`} disabled={busy} onClick={() => onOverride(item.id, null)}>
                            <UndoIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {!item.manual && !item.changed && <Chip size="small" label="sin cambio" variant="outlined" />}
                    <PriceCell key={`${item.id}-${item.newPrice}`} item={item} busy={busy} onCommit={(price) => onOverride(item.id, price)} />
                  </Box>
                </TableCell>
                {showCost && <TableCell align="right">{formatMoney(item.oldCost)}</TableCell>}
                {showCost && <TableCell align="right">{formatMoney(item.newCost)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {truncated && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Se muestran los primeros {items.length}. El cambio se aplica a los {formatInteger(count)}.
        </Typography>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={onApply} disabled={busy || count === 0}>
          Aplicar los cambios
        </Button>
        <Typography variant="body2" color="text.secondary">
          Después lo podés deshacer desde el historial.
        </Typography>
      </Box>
    </Paper>
  );
}
