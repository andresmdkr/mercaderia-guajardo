import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchCategories } from '../api/categoriesApi';

// Carga todas las categorías (son pocas). Lo usan la pantalla de categorías y la de productos.
export default function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchCategories();
        if (!cancelled) {
          setCategories(result);
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

  return { categories, loading, error, reload };
}
