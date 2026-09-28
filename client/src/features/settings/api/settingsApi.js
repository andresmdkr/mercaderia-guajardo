import api from '../../../services/api';

export const fetchBusinessSettings = () => api.get('/settings/business').then((res) => res.data);

// Versión de la aplicación: { version }
export const fetchAppVersion = () => api.get('/version').then((res) => res.data);

export const updateBusinessSettings = (data) => api.put('/settings/business', data).then((res) => res.data);
