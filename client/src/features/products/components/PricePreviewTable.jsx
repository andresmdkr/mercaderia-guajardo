import { Alert, Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, alpha } from '@mui/material';
import ArrowIcon from '@mui/icons-material/ArrowForwardOutlined';
import DiscardIcon from '@mui/icons-material/DeleteSweepOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { formatInteger, formatMoney } from '../../../utils/format';
import PriceCell from './PriceCell';
import PriceVariation from './PriceVariation';

// Vista previa: cómo quedarían los precios. Todavía no se cambió nada.
// Cada fila: precio actual (tachado) → precio nuevo (se puede escribir uno exacto) y la variación.
export default function PricePreviewTable({ preview, showCost, busy, onApply, onOverride, onDiscardManual }) {
  const { count, unchanged, items, truncated } = preview;
  const manualCount = items.filter((item) => item.manual).length;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        2. Revisá los cambios
      </Typography>

      {count === 0 && manualCount === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Con esos valores ningún precio cambia (por el redondeo o porque el porcentaje es muy chico). Igual podés escribir un precio a mano abajo.
        </Alert>
      )}

      <Typography sx={{ mb: 0.5 }}>
        Se van a cambiar los precios de <strong>{formatInteger(count)}</strong> {count === 1 ? 'producto' : 'productos'}
        {unchanged > 0 && ` (${formatInteger(unchanged)} no cambian)`}. Todavía no se modificó nada.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Para un precio exacto en algún producto, escribilo en el casillero de la derecha y apretá Enter.
        </Typography>
        {manualCount > 0 && (
          <Button size="small" color="warning" variant="outlined" startIcon={<DiscardIcon />} disabled={busy} onClick={onDiscardManual}>
            Descartar mis correcciones a mano ({manualCount})
          </Button>
        )}
      </Box>

      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Precio: antes → ahora</TableCell>
              <TableCell align="center">Variación</TableCell>
              {showCost && <TableCell align="right">Costo actual</TableCell>}
              {showCost && <TableCell align="right">Costo nuevo</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover sx={item.manual ? { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.14), '&.MuiTableRow-hover:hover': { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.2) } } : undefined}>
                <TableCell>
                  {item.name}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {item.code}
                    {item.manual && ' · precio puesto a mano'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    <Typography component="span" color="text.secondary" sx={{ textDecoration: 'line-through', whiteSpace: 'nowrap' }}>
                      {formatMoney(item.oldPrice)}
                    </Typography>
                    <ArrowIcon fontSize="small" color="disabled" />
                    <PriceCell key={`${item.id}-${item.newPrice}`} item={item} busy={busy} onCommit={(price) => onOverride(item.id, price)} />
                    <Tooltip title="Volver al precio calculado">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Volver al precio calculado de ${item.name}`}
                          disabled={busy || !item.manual}
                          onClick={() => onOverride(item.id, null)}
                          sx={{ visibility: item.manual ? 'visible' : 'hidden' }}
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <PriceVariation oldPrice={item.oldPrice} newPrice={item.newPrice} />
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
