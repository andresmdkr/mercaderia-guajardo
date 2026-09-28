import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { fetchProducts } from '../api/productsApi';

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 350;

// Maneja listado, filtros, paginación y recarga de productos.
export default function useProducts() {
  const [search, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lowStock, setLowStockFilter] = useState(false);
  const [showInactive, setShowInactiveFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchProducts({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          lowStock: lowStock || undefined,
          active: !showInactive,
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
  }, [page, debouncedSearch, lowStock, showInactive, reloadKey]);

  const setLowStock = (value) => {
    setLowStockFilter(value);
    setPage(1);
  };

  const setShowInactive = (value) => {
    setShowInactiveFilter(value);
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
    search,
    lowStock,
    showInactive,
    setSearch: setSearchText,
    setLowStock,
    setShowInactive,
    setPage,
    reload,
  };
}
