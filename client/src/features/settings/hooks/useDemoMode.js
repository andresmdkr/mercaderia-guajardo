import { useEffect, useState } from 'react';
import { fetchAppVersion } from '../api/settingsApi';

// El modo no cambia mientras la pantalla está abierta (cambiarlo reinicia la app): se consulta una sola vez.
let request = null;
const loadDemoFlag = () => (request ??= fetchAppVersion().then((info) => Boolean(info.demo)).catch(() => false));

// ¿La app está en modo de prueba? null mientras se consulta.
export default function useDemoMode() {
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadDemoFlag().then((value) => !cancelled && setDemo(value));
    return () => {
      cancelled = true;
    };
  }, []);

  return demo;
}
