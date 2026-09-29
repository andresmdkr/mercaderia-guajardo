import api from '../../../services/api';

export const fetchMovements = (params) => api.get('/stock/movements', { params }).then((res) => res.data);

export const createMovement = (data) => api.post('/stock/movements', data).then((res) => res.data);

export const createBulkMovement = (data) => api.post('/stock/movements/bulk', data).then((res) => res.data);
