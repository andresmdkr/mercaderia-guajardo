import { Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import { formatDateTime, formatInteger } from '../../../utils/format';

const formatPercent = (value) => `${value > 0 ? '+' : ''}${value.toLocaleString('es-AR')}%`;

// "+10% · Bebidas · redondeo a $10 · costo +10%"
function describe(item) {
  const parts = [formatPercent(item.percent), item.categoryName ? `Categoría ${item.categoryName}` : 'Todos los productos'];
  if (item.roundTo > 0) parts.push(`redondeo a $${item.roundTo}`);
  if (item.costPercent !== null) parts.push(`costo ${formatPercent(item.costPercent)}`);
  return parts.join(' · ');
}

// Últimas actualizaciones de precios. Solo la última se puede deshacer.
export default function PriceHistoryCard({ items, busy, onUndo }) {
  if (items.length === 0) return null;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Historial
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Cambio</TableCell>
              <TableCell align="right">Productos</TableCell>
              <TableCell>Hizo</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.createdAt)}</TableCell>
                <TableCell>{describe(item)}</TableCell>
                <TableCell align="right">{formatInteger(item.count)}</TableCell>
                <TableCell>{item.userName}</TableCell>
                <TableCell align="right">
                  {item.undone && <Chip size="small" label="Deshecha" variant="outlined" />}
                  {item.canUndo && (
                    <Button size="small" startIcon={<UndoIcon />} disabled={busy} onClick={() => onUndo(item)}>
                      Deshacer
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
