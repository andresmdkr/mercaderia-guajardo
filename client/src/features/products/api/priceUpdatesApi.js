import api from '../../../services/api';

// Body de las llamadas: { percent, categoryId?, roundTo?, costPercent? }

// Vista previa (no cambia nada): { scopeCount, count, unchanged, items: [{ id, code, name, oldPrice, newPrice, oldCost, newCost }], truncated }
export const previewPriceUpdate = (body) => api.post('/price-updates/preview', body).then((res) => res.data);

// Aplica los cambios. `expectedCount` = productos que mostró la vista previa. → { batchId, count }
export const applyPriceUpdate = (body) => api.post('/price-updates', body).then((res) => res.data);

// Historial: [{ id, createdAt, percent, costPercent, categoryName, roundTo, count, undone, userName, canUndo }]
export const fetchPriceUpdates = () => api.get('/price-updates').then((res) => res.data);

// Deshace la última actualización → { restored, skipped }
export const undoPriceUpdate = (id) => api.post(`/price-updates/${id}/undo`).then((res) => res.data);
