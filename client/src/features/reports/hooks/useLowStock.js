import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchLowStock } from '../api/reportsApi';

const PAGE_SIZE = 10;

// Productos con stock igual o menor al mínimo (estado actual, no depende del período).
export default function useLowStock() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchLowStock({ page, limit: PAGE_SIZE });
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
  }, [page]);

  return { items: data.items, total: data.total, page, pageSize: PAGE_SIZE, loading, error, setPage };
}
