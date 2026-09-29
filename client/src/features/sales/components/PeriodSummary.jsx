import { Box, Paper, Typography } from '@mui/material';
import { formatInteger, formatMoney } from '../../../utils/format';
import { PAYMENT_METHODS } from '../salesConstants';

function Tile({ label, value, note, big = false }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {/* Cifras en la misma tipografía sans que el resto (nunca serif) */}
      <Typography
        component="p"
        sx={{
          my: 0.5,
          fontFamily: (theme) => theme.typography.fontFamily,
          fontSize: big ? 34 : 24,
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

const salesNote = (count) => `${formatInteger(count)} ${count === 1 ? 'venta' : 'ventas'}`;

// Cifras del período: total cobrado, cada medio de pago y, aparte, descuentos y ventas anuladas (esas no suman).
export default function PeriodSummary({ data, loading }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: loading ? 0.55 : 1, transition: 'opacity 0.15s' }}>
      <Tile big label="Total cobrado" value={formatMoney(data.total)} note={salesNote(data.salesCount)} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        {data.methods.map((method) => (
          <Tile
            key={method.method}
            label={PAYMENT_METHODS[method.method] ?? method.method}
            value={formatMoney(method.total)}
            note={salesNote(method.salesCount)}
          />
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
        <Tile label="Descuentos otorgados" value={formatMoney(data.discounts)} note="Ya están restados del total" />
        <Tile
          label="Ventas anuladas"
          value={formatMoney(data.voided.total)}
          note={`${salesNote(data.voided.count)} · no suman al total`}
        />
      </Box>
    </Box>
  );
}
