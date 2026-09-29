import { useEffect, useState } from 'react';
import { desktop } from '../../../services/desktop';

// Estado del actualizador de la app de escritorio. En el navegador `available` es false.
// status: idle | disabled | checking | downloading | ready | none | error
export default function useUpdates() {
  const [state, setState] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    if (!desktop) return undefined;
    let active = true;
    desktop.getUpdateStatus().then((current) => active && setState(current));
    const stopListening = desktop.onUpdateStatus((current) => setState(current));
    return () => {
      active = false;
      stopListening();
    };
  }, []);

  return {
    available: Boolean(desktop),
    status: state.status,
    message: state.message,
    check: () => desktop.checkForUpdates(),
    install: () => desktop.installUpdate(),
  };
}
