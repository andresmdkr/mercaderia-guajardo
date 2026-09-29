import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchCashClose } from '../../reports/api/reportsApi';

// Cierre de caja del día elegido (AAAA-MM-DD). Mientras recarga conserva los datos anteriores (`loading` los atenúa).
export default function useCashClose(date) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchCashClose(date);
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
  }, [date]);

  return { data, loading, error };
}
