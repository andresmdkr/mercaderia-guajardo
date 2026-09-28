import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchBusinessSettings, updateBusinessSettings } from '../api/settingsApi';

// Datos del negocio (nombre, dirección, teléfono, email): se cargan una vez y se pueden guardar.
export default function useBusinessSettings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchBusinessSettings();
        if (!cancelled) setSettings(result);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (values) => {
    setSettings(await updateBusinessSettings(values));
  };

  return { settings, error, loading: !settings && !error, save };
}
