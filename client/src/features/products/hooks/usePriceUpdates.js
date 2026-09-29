import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { applyPriceUpdate, fetchPriceUpdates, previewPriceUpdate, undoPriceUpdate } from '../api/priceUpdatesApi';

// Valores del formulario → body de la API. El costo solo se ajusta si se tildó la opción (con el mismo porcentaje).
export function toRequestBody(values) {
  return {
    percent: Number(values.percent),
    categoryId: values.categoryId || null,
    roundTo: Number(values.roundTo),
    costPercent: values.adjustCost ? Number(values.percent) : undefined,
  };
}

// Todo el flujo de "Actualizar precios": vista previa → aplicar → historial → deshacer.
export default function usePriceUpdates() {
  const [history, setHistory] = useState([]);
  const [preview, setPreview] = useState(null); // { body, result } de la última vista previa
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPriceUpdates()
      .then((items) => !cancelled && setHistory(items))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reloadHistory = useCallback(() => setReloadKey((key) => key + 1), []);
  const clearPreview = useCallback(() => setPreview(null), []);

  // Corre una acción con el estado de "ocupado" y el manejo de errores. Devuelve lo que devuelva la acción (o null si falló).
  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const showPreview = (values) =>
    run(async () => {
      const body = toRequestBody(values);
      setPreview({ body, result: await previewPriceUpdate(body) });
    });

  // Aplica lo que mostró la vista previa. Devuelve { count } o null si falló.
  const apply = () =>
    run(async () => {
      const outcome = await applyPriceUpdate({ ...preview.body, expectedCount: preview.result.count });
      setPreview(null);
      reloadHistory();
      return outcome;
    });

  const undo = (id) =>
    run(async () => {
      const outcome = await undoPriceUpdate(id);
      reloadHistory();
      return outcome;
    });

  return { history, preview, busy, error, showPreview, clearPreview, apply, undo };
}
