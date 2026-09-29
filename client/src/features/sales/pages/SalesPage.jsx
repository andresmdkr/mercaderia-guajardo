import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Snackbar, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearFiltersButton from '../../../components/ClearFiltersButton';
import PageHeader from '../../../components/PageHeader';
import PeriodFilter from '../../../components/PeriodFilter';
import CustomerPicker from '../../customers/components/CustomerPicker';
import SaleDetailDialog from '../components/SaleDetailDialog';
import SalesTable from '../components/SalesTable';
import useSales from '../hooks/useSales';
import { PAYMENT_METHODS, SALE_STATUSES } from '../salesConstants';

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
            {/* La acción de vender es siempre verde (igual que el botón del menú), no el terracota de las demás altas */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/sales/new"
              sx={(theme) => ({
                bgcolor: theme.palette.sections.sales,
                color: theme.palette.getContrastText(theme.palette.sections.sales),
                '&:hover': { bgcolor: theme.palette.sections.sales, filter: 'brightness(0.92)' },
              })}
            >
              Nueva venta
            </Button>
          </>
        }
      />

      {/* Período (accesos rápidos + fechas): el mismo filtro que usan Reportes y Resúmenes */}
      <Box sx={{ mb: 2 }}>
        <PeriodFilter period={sales.filters} onPreset={sales.setPreset} onDate={sales.setDate} />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, mb: 2 }}>
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
        <ClearFiltersButton visible={sales.hasActiveFilters} onClick={sales.clearFilters} />
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
        sort={sales.sort}
        onSort={sales.toggleSort}
        onOpen={(sale) => setOpenSaleId(sale.id)}
      />

      {openSaleId && <SaleDetailDialog saleId={openSaleId} onClose={() => setOpenSaleId(null)} onChanged={handleChanged} />}

      <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage(null)}>
        {message ? <Alert severity={message.severity}>{message.text}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
