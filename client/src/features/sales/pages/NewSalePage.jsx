import { useRef } from 'react';
import { Alert, Box, Button, Grid, IconButton, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PageHeader from '../../../components/PageHeader';
import { formatMoney, formatSaleNumber } from '../../../utils/format';
import ProductPicker from '../../products/components/ProductPicker';
import useBusinessSettings from '../../settings/hooks/useBusinessSettings';
import CartTable from '../components/CartTable';
import CodeEntry from '../components/CodeEntry';
import PrintReceiptButton from '../components/PrintReceiptButton';
import SaleSummary from '../components/SaleSummary';
import useNewSale from '../hooks/useNewSale';
import { openReceiptPdf } from '../pdf/receiptPdf';

export default function NewSalePage() {
  const sale = useNewSale();
  const business = useBusinessSettings(); // datos del encabezado del comprobante
  const searchInputRef = useRef(null);

  // Al terminar una venta, el cursor vuelve al buscador para arrancar la siguiente.
  const handleConfirm = async () => {
    await sale.confirm();
    searchInputRef.current?.focus();
  };

  return (
    <>
      <PageHeader sectionKey="sales" title="Nueva venta" />

      {sale.lastSale && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                startIcon={<PdfIcon />}
                disabled={!business.settings}
                onClick={() => openReceiptPdf(sale.lastSale, business.settings)}
              >
                Comprobante PDF
              </Button>
              <PrintReceiptButton color="inherit" size="small" sale={sale.lastSale} business={business.settings} />
              <IconButton color="inherit" size="small" aria-label="Cerrar" onClick={sale.dismissLastSale}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
        >
          Venta {formatSaleNumber(sale.lastSale.id)} registrada · Total {formatMoney(sale.lastSale.total)}
        </Alert>
      )}

      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Lo principal es buscar por nombre; el lector de código queda como opción */}
              <Box sx={{ flex: '2 1 320px' }}>
                <ProductPicker
                  label="Buscá el producto por nombre o código"
                  value={null}
                  onChange={(product) => product && sale.addProduct(product)}
                  inputRef={searchInputRef}
                  autoFocus
                  clearOnSelect
                />
              </Box>
              <Box sx={{ flex: '1 1 220px' }}>
                <CodeEntry onSubmit={sale.addByCode} />
              </Box>
            </Box>
            {sale.entryError && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {sale.entryError}
              </Alert>
            )}
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
