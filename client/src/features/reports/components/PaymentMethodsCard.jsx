import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import { formatInteger, formatMoney } from '../../../utils/format';
import { PAYMENT_METHODS } from '../../sales/salesConstants';

// Cómo pagan los clientes en el período: una barra por medio de pago, con su porcentaje del total cobrado.
export default function PaymentMethodsCard({ rows, loading }) {
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <Paper sx={{ p: 2.5, opacity: loading ? 0.55 : 1, transition: 'opacity 0.15s' }}>
      <Typography variant="h6">Medios de pago</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cuánto se cobró con cada medio en el período.
      </Typography>

      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          No hay ventas en este período.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((row) => {
            const share = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
            return (
              <Box key={row.method}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>{PAYMENT_METHODS[row.method] ?? row.method}</Typography>
                  <Typography>
                    {formatMoney(row.total)} · {share.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={share} sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant="caption" color="text.secondary">
                  {formatInteger(row.salesCount)} {row.salesCount === 1 ? 'venta' : 'ventas'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
