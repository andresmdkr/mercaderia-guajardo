import api from '../../../services/api';

export const fetchBusinessSettings = () => api.get('/settings/business').then((res) => res.data);

export const updateBusinessSettings = (data) => api.put('/settings/business', data).then((res) => res.data);
