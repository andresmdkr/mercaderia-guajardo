import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { presetRange } from '../../../utils/dateRange';
import { fetchSales } from '../api/salesApi';

const PAGE_SIZE = 20;

// Cómo se abre la pantalla: las ventas de hoy, sin otros filtros.
const defaultFilters = () => ({
  preset: 'today',
  ...presetRange('today'),
  status: '',
  paymentMethod: '',
  customer: null,
});

// Listado de ventas con filtros (período, estado, medio de pago, cliente) y paginación.
export default function useSales() {
  const [filters, setFilters] = useState(defaultFilters);
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

  const hasActiveFilters = filters.preset !== 'today' || Boolean(filters.status || filters.paymentMethod || filters.customer);
  const clearFilters = () => {
    setFilters(defaultFilters());
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
    hasActiveFilters,
    clearFilters,
    setFilter,
    setPreset,
    setDate,
    setPage,
    reload,
  };
}
