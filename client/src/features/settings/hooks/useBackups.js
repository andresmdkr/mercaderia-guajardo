import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { createBackup, fetchBackups } from '../api/settingsApi';

// Lista de copias de seguridad y la acción de hacer una nueva.
export default function useBackups() {
  const [data, setData] = useState({ folder: '', items: [] });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchBackups();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Devuelve true si la copia se hizo.
  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      await createBackup();
      reload();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setCreating(false);
    }
  };

  return { folder: data.folder, items: data.items, loading, creating, error, create };
}
