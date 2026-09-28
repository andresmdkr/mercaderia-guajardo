import { Box, Paper, Typography } from '@mui/material';
import { formatInteger, formatMoney } from '../../../utils/format';

function Tile({ label, value, note }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {/* Cifras grandes en la misma tipografía sans que el resto (nunca serif) y con números proporcionales */}
      <Typography
        component="p"
        sx={{
          my: 0.5,
          fontFamily: (theme) => theme.typography.fontFamily,
          fontSize: 26,
          fontWeight: 600,
          lineHeight: 1.3,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {note}
      </Typography>
    </Paper>
  );
}

// Las cifras clave del período, en pocas tarjetas (son números, no hace falta un gráfico).
export default function SummaryTiles({ summary, loading }) {
  const empty = !summary;
  const voided = summary?.voidedCount ?? 0;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: 2,
        opacity: loading ? 0.55 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <Tile
        label="Total vendido"
        value={empty ? '—' : formatMoney(summary.revenue)}
        note={empty ? ' ' : `Descuentos otorgados: ${formatMoney(summary.discounts)}`}
      />
      <Tile
        label="Ganancia estimada"
        value={empty ? '—' : formatMoney(summary.profit)}
        note={empty ? ' ' : `Costo de lo vendido: ${formatMoney(summary.cost)}`}
      />
      <Tile label="Ticket promedio" value={empty ? '—' : formatMoney(summary.averageTicket)} note="Por venta" />
      <Tile
        label="Ventas"
        value={empty ? '—' : formatInteger(summary.salesCount)}
        note={empty ? ' ' : voided > 0 ? `${formatInteger(voided)} anulada${voided === 1 ? '' : 's'}, no se cuentan` : 'Completadas'}
      />
    </Box>
  );
}
