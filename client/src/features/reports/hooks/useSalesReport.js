import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchPaymentMethods, fetchSummary, fetchTopCustomers, fetchTopProducts } from '../api/reportsApi';

const TOP_LIMIT = 10;

// Resumen del período, productos más vendidos (por unidades o por facturación), medios de pago y mejores clientes.
// Mientras recarga conserva los datos anteriores (`loading` sirve para atenuarlos, sin saltos de pantalla).
export default function useSalesReport(period, sort) {
  const [data, setData] = useState({
    summary: null,
    topProducts: [],
    paymentMethods: [],
    topCustomers: { items: [], withoutCustomer: { salesCount: 0, total: 0 } },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const params = { from: period.from || undefined, to: period.to || undefined };
      try {
        const [summary, topProducts, paymentMethods, topCustomers] = await Promise.all([
          fetchSummary(params),
          fetchTopProducts({ ...params, sort, limit: TOP_LIMIT }),
          fetchPaymentMethods(params),
          fetchTopCustomers({ ...params, limit: TOP_LIMIT }),
        ]);
        if (!cancelled) {
          setData({ summary, topProducts, paymentMethods, topCustomers });
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
