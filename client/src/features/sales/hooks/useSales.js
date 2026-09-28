import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchSales } from '../api/salesApi';

const PAGE_SIZE = 15;

const pad = (n) => String(n).padStart(2, '0');
// Fecha local como AAAA-MM-DD (toISOString usaría UTC y corre el día).
const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const DATE_PRESETS = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  all: 'Todas',
};

function presetRange(preset) {
  const now = new Date();
  if (preset === 'today') return { from: toISODate(now), to: toISODate(now) };
  if (preset === 'week') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // la semana arranca el lunes
    return { from: toISODate(monday), to: toISODate(now) };
  }
  if (preset === 'month') return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
  return { from: '', to: '' };
}

// Listado de ventas con filtros (período, estado, medio de pago, cliente) y paginación.
export default function useSales() {
  const [filters, setFilters] = useState(() => ({
    preset: 'today',
    ...presetRange('today'),
    status: '',
    paymentMethod: '',
    customer: null,
  }));
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchSales({
          page,
          limit: PAGE_SIZE,
          from: filters.from || undefined,
          to: filters.to || undefined,
          status: filters.status || undefined,
          paymentMethod: filters.paymentMethod || undefined,
          customerId: filters.customer?.id,
        });
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
  }, [page, filters, reloadKey]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const setPreset = (preset) => {
    setFilters((prev) => ({ ...prev, preset, ...presetRange(preset) }));
    setPage(1);
  };

  // Al tocar una fecha a mano, el período pasa a ser "personalizado".
  const setDate = (name, value) => {
    setFilters((prev) => ({ ...prev, preset: 'custom', [name]: value }));
    setPage(1);
  };

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    items: data.items,
    total: data.total,
    page,
    pageSize: PAGE_SIZE,
    loading,
    error,
    filters,
    setFilter,
    setPreset,
    setDate,
    setPage,
    reload,
  };
}
