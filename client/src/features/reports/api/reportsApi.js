import api from '../../../services/api';

export const fetchSummary = (params) => api.get('/reports/summary', { params }).then((res) => res.data);

export const fetchTopProducts = (params) => api.get('/reports/top-products', { params }).then((res) => res.data);

export const fetchLowStock = (params) => api.get('/reports/low-stock', { params }).then((res) => res.data);
