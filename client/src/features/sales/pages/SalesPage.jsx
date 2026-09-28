import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Snackbar, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../../components/PageHeader';
import CustomerPicker from '../../customers/components/CustomerPicker';
import SaleDetailDialog from '../components/SaleDetailDialog';
import SalesTable from '../components/SalesTable';
import useSales, { DATE_PRESETS } from '../hooks/useSales';
import { PAYMENT_METHODS, SALE_STATUSES } from '../salesConstants';

const dateFieldProps = { size: 'small', type: 'date', slotProps: { inputLabel: { shrink: true } }, sx: { bgcolor: 'background.paper' } };

export default function SalesPage() {
  const sales = useSales();
  const [openSaleId, setOpenSaleId] = useState(null);
  const [message, setMessage] = useState(null);

  const handleChanged = (text) => {
    setMessage({ severity: 'success', text });
    sales.reload();
  };

  return (
    <>
      <PageHeader
        sectionKey="sales"
        title="Ventas"
        actions={
          <>
            {sales.loading && <CircularProgress size={22} />}
            <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/sales/new">
              Nueva venta
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {Object.entries(DATE_PRESETS).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            clickable
            color={sales.filters.preset === key ? 'primary' : 'default'}
            variant={sales.filters.preset === key ? 'filled' : 'outlined'}
            onClick={() => sales.setPreset(key)}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <TextField label="Desde" value={sales.filters.from} onChange={(event) => sales.setDate('from', event.target.value)} {...dateFieldProps} />
        <TextField label="Hasta" value={sales.filters.to} onChange={(event) => sales.setDate('to', event.target.value)} {...dateFieldProps} />
        <TextField
          select
          size="small"
          label="Estado"
          value={sales.filters.status}
          onChange={(event) => sales.setFilter('status', event.target.value)}
          sx={{ minWidth: 150, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(SALE_STATUSES).map(([key, { label }]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Pago"
          value={sales.filters.paymentMethod}
          onChange={(event) => sales.setFilter('paymentMethod', event.target.value)}
          sx={{ minWidth: 150, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ width: 260, bgcolor: 'background.paper' }}>
          <CustomerPicker value={sales.filters.customer} onChange={(customer) => sales.setFilter('customer', customer)} />
        </Box>
      </Box>

      {sales.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {sales.error}
        </Alert>
      )}

      <SalesTable
        items={sales.items}
        total={sales.total}
        page={sales.page}
        pageSize={sales.pageSize}
        onPageChange={sales.setPage}
        onOpen={(sale) => setOpenSaleId(sale.id)}
      />

      {openSaleId && <SaleDetailDialog saleId={openSaleId} onClose={() => setOpenSaleId(null)} onChanged={handleChanged} />}

      <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage(null)}>
        {message ? <Alert severity={message.severity}>{message.text}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
