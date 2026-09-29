import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { fetchExternalBackup } from '../api/settingsApi';
import { externalWarningText } from '../backupWarnings';

const DISMISS_KEY = 'externalBackupWarningDismissedAt';
const DISMISS_DAYS = 14;

// Si el usuario dijo "Ahora no", no se vuelve a mostrar por un tiempo. (Solo una comodidad: si el navegador no deja
// guardar, la advertencia simplemente sigue apareciendo.)
function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Advertencia (no obligatoria) en Inicio: la copia externa no está configurada, falló o está atrasada.
export default function ExternalBackupWarning() {
  const [external, setExternal] = useState(null);
  const [hidden, setHidden] = useState(recentlyDismissed);

  useEffect(() => {
    let cancelled = false;
    fetchExternalBackup()
      .then((status) => !cancelled && setExternal(status))
      .catch(() => {}); // si no se puede consultar, simplemente no se muestra nada
    return () => {
      cancelled = true;
    };
  }, []);

  const text = externalWarningText(external);
  if (!text || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // sin almacenamiento: se oculta solo hasta que se recargue la pantalla
    }
    setHidden(true);
  };

  return (
    <Alert
      severity="warning"
      sx={{ mb: 3 }}
      action={
        <>
          <Button color="inherit" size="small" component={RouterLink} to="/settings" sx={{ whiteSpace: 'nowrap' }}>
            Configurar
          </Button>
          <Button color="inherit" size="small" onClick={dismiss} sx={{ whiteSpace: 'nowrap' }}>
            Ahora no
          </Button>
        </>
      }
    >
      {text}
    </Alert>
  );
}
