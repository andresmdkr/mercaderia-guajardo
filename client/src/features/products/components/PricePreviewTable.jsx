import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import DiscardIcon from '@mui/icons-material/DeleteSweepOutlined';
import { formatInteger } from '../../../utils/format';
import { normalizeText } from '../../../utils/text';
import PriceRow from './PriceRow';

const PAGE_SIZE = 50; // filas que se dibujan por vez: con cientos de casilleros editables la pantalla se pone lenta en una PC vieja

// Vista previa: cómo quedarían los precios. Todavía no se cambió nada.
// Cada fila: precio de antes (tachado) → precio nuevo (se puede escribir uno exacto) y la variación.
export default function PricePreviewTable({ preview, showCost, busy, onApply, onOverride, onDiscardManual }) {
  const { count, unchanged, items, truncated } = preview;
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [query, setQuery] = useState('');
  const manualCount = items.filter((item) => item.manual).length;

  // Buscador: filtra la lista que se ve (no cambia a qué productos se aplica el cambio).
  const needle = normalizeText(query.trim());
  const shown = needle ? items.filter((item) => normalizeText(`${item.name} ${item.code}`).includes(needle)) : items;
  const handleQuery = (event) => {
    setQuery(event.target.value);
    setVisible(PAGE_SIZE);
  };

  // Función estable para que las filas que no cambiaron no se vuelvan a dibujar.
  const latest = useRef(onOverride);
  useEffect(() => {
    latest.current = onOverride;
  });
  const handleOverride = useCallback((id, price) => latest.current(id, price), []);

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
          Para un precio exacto en algún producto, escribilo en la columna <strong>Ahora</strong> y apretá Enter.
        </Typography>
        {manualCount > 0 && (
          <Button size="small" color="warning" variant="outlined" startIcon={<DiscardIcon />} disabled={busy} onClick={onDiscardManual}>
            Descartar mis correcciones a mano ({manualCount})
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        value={query}
        onChange={handleQuery}
        placeholder="Buscar un producto de la lista"
        sx={{ mb: 1.5, width: { xs: '100%', sm: 320 } }}
        slotProps={{
          htmlInput: { 'aria-label': 'Buscar un producto de la lista' },
          input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
        }}
      />

      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Precio antes</TableCell>
              <TableCell sx={{ width: 32, px: 0 }} />
              <TableCell>Precio ahora</TableCell>
              <TableCell align="center">Variación</TableCell>
              {showCost && <TableCell align="right">Costo actual</TableCell>}
              {showCost && <TableCell align="right">Costo nuevo</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.slice(0, visible).map((item) => (
              <PriceRow key={item.id} item={item} showCost={showCost} busy={busy} onOverride={handleOverride} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {needle && shown.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Ningún producto de la lista coincide con «{query.trim()}».
        </Typography>
      )}
      {visible < shown.length && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
            Mostrar más productos ({formatInteger(shown.length - visible)} más)
          </Button>
          <Button size="small" onClick={() => setVisible(shown.length)}>
            Mostrar todos
          </Button>
        </Box>
      )}
      {truncated && visible >= shown.length && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Se muestran los primeros {formatInteger(items.length)}. El cambio se aplica a los {formatInteger(count)}.
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
