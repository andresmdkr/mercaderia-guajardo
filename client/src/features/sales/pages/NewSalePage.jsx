import { useRef } from 'react';
import { Alert, Box, Grid, Paper } from '@mui/material';
import PageHeader from '../../../components/PageHeader';
import { formatMoney, formatSaleNumber } from '../../../utils/format';
import ProductPicker from '../../products/components/ProductPicker';
import CartTable from '../components/CartTable';
import CodeEntry from '../components/CodeEntry';
import SaleSummary from '../components/SaleSummary';
import useNewSale from '../hooks/useNewSale';

export default function NewSalePage() {
  const sale = useNewSale();
  const codeInputRef = useRef(null);

  // Al terminar una venta, el cursor vuelve al campo de código para arrancar la siguiente.
  const handleConfirm = async () => {
    await sale.confirm();
    codeInputRef.current?.focus();
  };

  return (
    <>
      <PageHeader sectionKey="sales" title="Nueva venta" />

      {sale.lastSale && (
        <Alert severity="success" onClose={sale.dismissLastSale} sx={{ mb: 2 }}>
          Venta {formatSaleNumber(sale.lastSale.id)} registrada · Total {formatMoney(sale.lastSale.total)}
        </Alert>
      )}

      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 240px' }}>
                <CodeEntry onSubmit={sale.addByCode} error={sale.entryError} inputRef={codeInputRef} />
              </Box>
              <Box sx={{ flex: '2 1 320px' }}>
                <ProductPicker
                  label="O buscá por nombre"
                  value={null}
                  onChange={(product) => product && sale.addProduct(product)}
                  clearOnSelect
                />
              </Box>
            </Box>
          </Paper>

          <CartTable lines={sale.cart.lines} onQuantityChange={sale.cart.setQuantity} onRemove={sale.cart.remove} />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }} sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
          <SaleSummary
            totals={sale.totals}
            discount={sale.discount}
            onDiscountChange={sale.setDiscount}
            customer={sale.customer}
            onCustomerChange={sale.setCustomer}
            paymentMethod={sale.paymentMethod}
            onPaymentMethodChange={sale.setPaymentMethod}
            notes={sale.notes}
            onNotesChange={sale.setNotes}
            submitError={sale.submitError}
            submitting={sale.submitting}
            canConfirm={sale.canConfirm}
            onConfirm={handleConfirm}
          />
        </Grid>
      </Grid>
    </>
  );
}
