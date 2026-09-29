import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { formatDateTime, formatMoney, formatSaleNumber } from '../../../utils/format';
import useBusinessSettings from '../../settings/hooks/useBusinessSettings';
import { voidSale } from '../api/salesApi';
import useSaleDetail from '../hooks/useSaleDetail';
import { openReceiptPdf } from '../pdf/receiptPdf';
import { PAYMENT_METHODS, SALE_STATUSES } from '../salesConstants';
import PrintReceiptButton from './PrintReceiptButton';
import VoidSaleDialog from './VoidSaleDialog';

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{children}</Typography>
    </Box>
  );
}

function TotalRow({ label, value, strong }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography color={strong ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: strong ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: strong ? 700 : 400 }}>{value}</Typography>
    </Box>
  );
}

// Se monta solo cuando está abierto. `onChanged` avisa a la lista que la venta se modificó (anulación).
export default function SaleDetailDialog({ saleId, onClose, onChanged }) {
  const { sale, setSale, error, loading } = useSaleDetail(saleId);
  const business = useBusinessSettings(); // datos del encabezado del comprobante
  const [voiding, setVoiding] = useState(false);

  const handleVoid = async (reason) => {
    const updated = await voidSale(saleId, reason);
    setSale(updated);
    setVoiding(false);
    onChanged(`Venta ${formatSaleNumber(saleId)} anulada, stock devuelto`);
  };

  const status = sale ? SALE_STATUSES[sale.status] : null;

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          Venta {formatSaleNumber(saleId)}
          {status && <Chip size="small" label={status.label} color={status.color} />}
        </DialogTitle>

        <DialogContent>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {sale && (
            <>
              {sale.status === 'voided' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Anulada el {formatDateTime(sale.voidedAt)} por {sale.voidedByUser?.name ?? '—'}.
                  {sale.voidReason ? ` Motivo: ${sale.voidReason}` : ''}
                </Alert>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
                <Field label="Fecha">{formatDateTime(sale.createdAt)}</Field>
                <Field label="Cliente">{sale.customer?.name ?? 'Consumidor final'}</Field>
                <Field label="Medio de pago">{PAYMENT_METHODS[sale.paymentMethod]}</Field>
                <Field label="Registrada por">{sale.user.name}</Field>
              </Box>
              {sale.notes && (
                <Box sx={{ mb: 2 }}>
                  <Field label="Notas">{sale.notes}</Field>
                </Box>
              )}

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cant.</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.productName}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {item.productCode}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatMoney(item.unitPrice)}</TableCell>
                      <TableCell align="right">{formatMoney(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box sx={{ mt: 2, ml: 'auto', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <TotalRow label="Subtotal" value={formatMoney(sale.subtotal)} />
                {sale.discountAmount > 0 && (
                  <TotalRow
                    label={sale.discountType === 'percent' ? `Descuento (${sale.discountValue}%)` : 'Descuento'}
                    value={`− ${formatMoney(sale.discountAmount)}`}
                  />
                )}
                <TotalRow label="Total" value={formatMoney(sale.total)} strong />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          {sale?.status === 'completed' && (
            <Button color="error" onClick={() => setVoiding(true)}>
              Anular venta
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            startIcon={<PdfIcon />}
            disabled={!sale || !business.settings}
            onClick={() => openReceiptPdf(sale, business.settings)}
          >
            Comprobante PDF
          </Button>
          <PrintReceiptButton sale={sale} business={business.settings} />
          <Button color="inherit" onClick={onClose}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {voiding && <VoidSaleDialog sale={sale} onCancel={() => setVoiding(false)} onConfirm={handleVoid} />}
    </>
  );
}
