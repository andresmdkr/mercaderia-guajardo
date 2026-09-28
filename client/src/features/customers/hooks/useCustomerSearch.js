import { useEffect, useState } from 'react';
import { fetchCustomers } from '../api/customersApi';

const SEARCH_DELAY_MS = 250;
const MAX_OPTIONS = 15;

// Busca clientes activos por nombre, teléfono o email mientras se escribe (para selectores).
export default function useCustomerSearch(inputValue) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchCustomers({ search: inputValue.trim() || undefined, limit: MAX_OPTIONS, active: true });
        if (!cancelled) setOptions(result.items);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue]);

  return { options, loading };
}
