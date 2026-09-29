import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchPeriodSummary } from '../../reports/api/reportsApi';

// Resumen de ventas del período elegido ({ from, to } en AAAA-MM-DD, '' = sin límite).
// Mientras recarga conserva los datos anteriores (`loading` los atenúa, sin saltos de pantalla).
export default function usePeriodSummary(period) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchPeriodSummary({ from: period.from || undefined, to: period.to || undefined });
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
  }, [period.from, period.to]);

  return { data, loading, error };
}
