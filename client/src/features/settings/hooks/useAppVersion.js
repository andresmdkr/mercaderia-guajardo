import { useEffect, useState } from 'react';
import { fetchAppVersion } from '../api/settingsApi';

// Versión instalada de la aplicación (null mientras se consulta o si no se pudo obtener).
export default function useAppVersion() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAppVersion()
      .then((result) => !cancelled && setVersion(result.version))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
