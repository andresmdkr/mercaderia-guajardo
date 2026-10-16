import { memo } from 'react';
import { Box, IconButton, TableCell, TableRow, Tooltip, Typography, alpha } from '@mui/material';
import ArrowIcon from '@mui/icons-material/ArrowForwardOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { formatMoney } from '../../../utils/format';
import PriceCell from './PriceCell';
import PriceVariation from './PriceVariation';

const manualRowSx = {
  bgcolor: (theme) => alpha(theme.palette.warning.main, 0.14),
  '&.MuiTableRow-hover:hover': { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.2) },
};

// Una fila de la vista previa: precio de antes (tachado) → precio nuevo (editable) y la variación.
function PriceRow({ item, showCost, busy, onOverride }) {
  return (
    <TableRow hover sx={item.manual ? manualRowSx : undefined}>
      <TableCell>
        {item.name}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {item.code}
          {item.manual && ' · precio puesto a mano'}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary', textDecoration: 'line-through' }}>
        {formatMoney(item.oldPrice)}
      </TableCell>
      <TableCell align="center" sx={{ px: 0 }}>
        <ArrowIcon fontSize="small" color="disabled" sx={{ verticalAlign: 'middle' }} />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
          <PriceCell key={`${item.id}-${item.newPrice}`} item={item} busy={busy} onCommit={(price) => onOverride(item.id, price)} />
          <Tooltip title="Volver al precio calculado">
            <span>
              <IconButton
                size="small"
                aria-label={`Volver al precio calculado de ${item.name}`}
                disabled={busy || !item.manual}
                onClick={() => onOverride(item.id, null)}
                sx={{ ml: 0.5, visibility: item.manual ? 'visible' : 'hidden' }}
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
  );
}

// Cada vez que se pide la vista previa llegan objetos nuevos aunque casi todas las filas no cambiaron:
// se compara por contenido para redibujar solo las que cambiaron (importa en una PC lenta, con cientos de filas).
const sameRow = (a, b) =>
  a.busy === b.busy &&
  a.showCost === b.showCost &&
  a.onOverride === b.onOverride &&
  a.item.id === b.item.id &&
  a.item.manual === b.item.manual &&
  a.item.oldPrice === b.item.oldPrice &&
  a.item.newPrice === b.item.newPrice &&
  a.item.oldCost === b.item.oldCost &&
  a.item.newCost === b.item.newCost;

export default memo(PriceRow, sameRow);
