import { useEffect, useState } from 'react';
import { fetchProducts } from '../api/productsApi';

const SEARCH_DELAY_MS = 250;
const MAX_OPTIONS = 15;

// Busca productos por código o nombre mientras se escribe (para selectores).
export default function useProductSearch(inputValue, { includeInactive = false } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchProducts({
          search: inputValue.trim() || undefined,
          limit: MAX_OPTIONS,
          active: includeInactive ? undefined : true,
        });
        if (!cancelled) setOptions(result.items);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue, includeInactive]);

  return { options, loading };
}
