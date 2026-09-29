import { useState } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { whatsappUrl } from '../../../utils/whatsapp';
import { describeShareResult, sendReceiptByWhatsapp } from '../whatsapp/sendReceipt';
import ReceiptPhoneDialog from './ReceiptPhoneDialog';

// Manda el comprobante por WhatsApp: al celular del cliente de la venta o, si no tiene, al número que se escriba.
export default function SendReceiptWhatsappButton({ sale, business, ...buttonProps }) {
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // { severity, text }

  const send = async (url) => {
    setAsking(false);
    setSending(true);
    try {
      setNotice(describeShareResult(await sendReceiptByWhatsapp(sale, business, url)));
    } catch {
      setNotice({ severity: 'error', text: 'No se pudo enviar el comprobante' });
    } finally {
      setSending(false);
    }
  };

  const handleClick = () => {
    const customerUrl = whatsappUrl(sale?.customer?.phone);
    if (customerUrl) send(customerUrl);
    else setAsking(true);
  };

  return (
    <>
      <Button
        startIcon={<WhatsAppIcon />}
        disabled={!sale || !business || sale.status === 'voided' || sending}
        onClick={handleClick}
        {...buttonProps}
      >
        Enviar por WhatsApp
      </Button>
      {asking && <ReceiptPhoneDialog defaultPhone={sale?.customer?.phone ?? ''} onCancel={() => setAsking(false)} onSend={send} />}
      <Snackbar open={Boolean(notice)} autoHideDuration={9000} onClose={() => setNotice(null)}>
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)}>
            {notice.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
