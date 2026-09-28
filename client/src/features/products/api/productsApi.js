import api from '../../../services/api';

export const fetchProducts = (params) => api.get('/products', { params }).then((res) => res.data);

// Coincidencia exacta por código (para escanear o tipear en la pantalla de venta).
export const fetchProductByCode = (code) =>
  api.get(`/products/by-code/${encodeURIComponent(code)}`).then((res) => res.data);

export const createProduct = (data) => api.post('/products', data).then((res) => res.data);

export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((res) => res.data);

export const setProductActive = (id, active) =>
  api.patch(`/products/${id}/status`, { active }).then((res) => res.data);
