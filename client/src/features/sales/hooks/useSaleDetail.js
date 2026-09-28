import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchSale } from '../api/salesApi';

// Carga el detalle completo de una venta (ítems, cliente, quién la anuló, etc.).
export default function useSaleDetail(saleId) {
  const [sale, setSale] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchSale(saleId);
        if (!cancelled) setSale(result);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  return { sale, setSale, error, loading: !sale && !error };
}
