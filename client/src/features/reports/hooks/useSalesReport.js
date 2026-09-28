import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchSummary, fetchTopProducts } from '../api/reportsApi';

const TOP_LIMIT = 10;

// Resumen del período y ranking de productos más vendidos (por unidades o por facturación).
// Mientras recarga conserva los datos anteriores (`loading` sirve para atenuarlos, sin saltos de pantalla).
export default function useSalesReport(period, sort) {
  const [data, setData] = useState({ summary: null, topProducts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const params = { from: period.from || undefined, to: period.to || undefined };
      try {
        const [summary, topProducts] = await Promise.all([
          fetchSummary(params),
          fetchTopProducts({ ...params, sort, limit: TOP_LIMIT }),
        ]);
        if (!cancelled) {
          setData({ summary, topProducts });
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
  }, [period.from, period.to, sort]);

  return { ...data, loading, error };
}
