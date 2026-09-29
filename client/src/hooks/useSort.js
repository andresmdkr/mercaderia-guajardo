import { useState } from 'react';

const noSort = { field: null, direction: 'asc' };

// Orden de un listado por columna. Tocar una columna: ascendente → descendente → vuelve al orden de siempre.
// Tocar otra columna empieza de nuevo en ascendente. `onChange` se llama al cambiar (para volver a la página 1).
export default function useSort(onChange) {
  const [sort, setSort] = useState(noSort);

  const toggleSort = (field) => {
    setSort((current) => {
      if (current.field !== field) return { field, direction: 'asc' };
      return current.direction === 'asc' ? { field, direction: 'desc' } : noSort;
    });
    onChange?.();
  };

  // Vuelve al orden de siempre (lo usa "Limpiar filtros").
  const resetSort = () => setSort(noSort);

  return { sort, toggleSort, resetSort };
}
