import api from '../../../services/api';

export const createSale = (data) => api.post('/sales', data).then((res) => res.data);

export const fetchSales = (params) => api.get('/sales', { params }).then((res) => res.data);

export const fetchSale = (id) => api.get(`/sales/${id}`).then((res) => res.data);

export const voidSale = (id, reason) => api.post(`/sales/${id}/void`, { reason }).then((res) => res.data);
