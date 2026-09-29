import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { formatInteger, formatMoney } from '../../../utils/format';

// Vista previa: cómo quedarían los precios. Todavía no se cambió nada.
export default function PricePreviewTable({ preview, showCost, busy, onApply }) {
  const { count, unchanged, items, truncated } = preview;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        2. Revisá los cambios
      </Typography>

      {count === 0 ? (
        <Alert severity="info">Con esos valores ningún precio cambia (por el redondeo o porque el porcentaje es muy chico).</Alert>
      ) : (
        <>
          <Typography sx={{ mb: 2 }}>
            Se van a cambiar los precios de <strong>{formatInteger(count)}</strong> {count === 1 ? 'producto' : 'productos'}
            {unchanged > 0 && ` (${formatInteger(unchanged)} no cambian)`}. Todavía no se modificó nada.
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
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatMoney(item.newPrice)}
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
            <Button variant="contained" onClick={onApply} disabled={busy}>
              Aplicar los cambios
            </Button>
            <Typography variant="body2" color="text.secondary">
              Después lo podés deshacer desde el historial.
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}
