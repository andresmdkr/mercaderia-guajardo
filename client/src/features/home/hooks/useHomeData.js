import { useEffect, useState } from 'react';
import { toISODate } from '../../../utils/dateRange';
import { fetchLowStock, fetchSummary } from '../../reports/api/reportsApi';
import { fetchSales } from '../../sales/api/salesApi';

const LIST_SIZE = 6;

// Datos del panel de Inicio: resumen de hoy, últimas ventas de hoy y productos por reponer.
// Cada bloque carga por su lado: si uno falla, los demás se muestran igual (el que falló queda en null).
export default function useHomeData() {
  const [data, setData] = useState({ summary: null, sales: null, lowStock: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = toISODate(new Date());

    Promise.allSettled([
      fetchSummary({ from: today, to: today }),
      fetchSales({ page: 1, limit: LIST_SIZE, from: today, to: today }),
      fetchLowStock({ page: 1, limit: LIST_SIZE }),
    ]).then(([summary, sales, lowStock]) => {
      if (cancelled) return;
      setData({
        summary: summary.status === 'fulfilled' ? summary.value : null,
        sales: sales.status === 'fulfilled' ? sales.value : null,
        lowStock: lowStock.status === 'fulfilled' ? lowStock.value : null,
      });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading };
}
