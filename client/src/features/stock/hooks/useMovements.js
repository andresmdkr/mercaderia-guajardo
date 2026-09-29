import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchMovements } from '../api/stockApi';

const PAGE_SIZE = 20;

const emptyFilters = { product: null, type: '', from: '', to: '' };

// Listado de movimientos con filtros (producto, tipo, rango de fechas) y paginación.
export default function useMovements() {
  const [filters, setFilters] = useState(emptyFilters);
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
        const result = await fetchMovements({
          page,
          limit: PAGE_SIZE,
          productId: filters.product?.id,
          type: filters.type || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
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

  const hasActiveFilters = Boolean(filters.product || filters.type || filters.from || filters.to);
  const clearFilters = () => {
    setFilters(emptyFilters);
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
    setPage,
    reload,
  };
}
