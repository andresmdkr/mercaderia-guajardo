import { useState } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import { printReceipt } from '../print/printReceipt';

// Imprime el comprobante: abre el diálogo de impresión para elegir la impresora.
// Cancelar el diálogo no es un error; si falla de verdad, se avisa.
export default function PrintReceiptButton({ sale, business, ...buttonProps }) {
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);

  const handleClick = async () => {
    setPrinting(true);
    try {
      const result = await printReceipt(sale, business);
      if (!result.ok && !result.cancelled) setError(result.message ?? 'No se pudo imprimir');
    } catch {
      setError('No se pudo imprimir');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <Button startIcon={<PrintIcon />} disabled={!sale || !business || printing} onClick={handleClick} {...buttonProps}>
        Imprimir
      </Button>
      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
