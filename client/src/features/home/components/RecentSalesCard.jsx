import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { formatMoney, formatSaleNumber } from '../../../utils/format';
import { SALE_STATUSES } from '../../sales/salesConstants';

const timeFormat = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

// Últimas ventas de hoy (la lista completa está en Ventas).
export default function RecentSalesCard({ sales }) {
  const items = sales?.items ?? [];

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Ventas de hoy
        </Typography>
        <Button component={RouterLink} to="/sales" size="small">
          Ver todas
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {sales ? 'Todavía no hay ventas hoy.' : 'No se pudieron cargar las ventas.'}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {items.map((sale) => {
            const voided = sale.status === 'voided';
            return (
              <Box
                component="li"
                key={sale.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ width: 44, fontVariantNumeric: 'tabular-nums' }}>
                  {timeFormat.format(new Date(sale.createdAt))}
                </Typography>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {sale.customer?.name ?? 'Consumidor final'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatSaleNumber(sale.id)}
                  </Typography>
                </Box>
                {voided && <Chip size="small" label={SALE_STATUSES.voided.label} />}
                <Typography
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', textDecoration: voided ? 'line-through' : 'none', color: voided ? 'text.secondary' : 'inherit' }}
                >
                  {formatMoney(sale.total)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
