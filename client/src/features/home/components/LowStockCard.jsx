import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircleOutlined';
import { formatInteger } from '../../../utils/format';

// Productos por reponer (en o bajo su stock mínimo), los más urgentes primero. El detalle completo está en Reportes.
export default function LowStockCard({ lowStock }) {
  const items = lowStock?.items ?? [];
  const total = lowStock?.total ?? 0;

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Por reponer
          {total > 0 && (
            <Chip size="small" color="warning" label={formatInteger(total)} sx={{ ml: 1, verticalAlign: 'middle' }} />
          )}
        </Typography>
        <Button component={RouterLink} to="/reports" size="small">
          Ver todos
        </Button>
      </Box>

      {items.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 3, color: 'text.secondary' }}>
          {lowStock && <CheckIcon color="success" />}
          <Typography color="text.secondary">
            {lowStock ? 'Todo en orden: ningún producto está por debajo de su mínimo.' : 'No se pudo cargar el stock.'}
          </Typography>
        </Box>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {items.map((product) => (
            <Box
              component="li"
              key={product.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {product.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {product.code} · mínimo {formatInteger(product.minStock)}
                </Typography>
              </Box>
              <Chip
                size="small"
                color={product.stock === 0 ? 'error' : 'warning'}
                label={product.stock === 0 ? 'Sin stock' : `${formatInteger(product.stock)} en stock`}
              />
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
