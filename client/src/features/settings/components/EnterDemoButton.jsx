import { useState } from 'react';
import { Alert, Button } from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { desktop } from '../../../services/desktop';

// Botón que reinicia la aplicación en modo de prueba (o arma una demo nueva si ya estaba). Solo en la app instalada.
export default function EnterDemoButton({ label = 'Entrar en modo de prueba', variant = 'outlined', restart = false }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!desktop) return null;

  const handleConfirm = async () => {
    setConfirming(false);
    setBusy(true);
    setError(null);
    const result = await desktop.enterDemo();
    // Si salió bien la aplicación se reinicia sola.
    if (!result.ok) {
      setError(result.message || 'No se pudo entrar al modo de prueba');
      setBusy(false);
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Button variant={variant} startIcon={<ScienceIcon />} onClick={() => setConfirming(true)} disabled={busy}>
        {busy ? 'Reiniciando…' : label}
      </Button>
      {confirming && (
        <ConfirmDialog
          title={restart ? 'Reiniciar la demo' : 'Entrar en modo de prueba'}
          message={
            restart
              ? 'Se arma una demo nueva con los datos de ejemplo de siempre (lo que hayas probado se descarta) y la aplicación se reinicia.'
              : 'La aplicación se reinicia con datos de ejemplo para poder mostrarla. Tus datos reales no se tocan y podés volver cuando quieras.'
          }
          confirmLabel={restart ? 'Reiniciar la demo' : 'Entrar'}
          color="primary"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
