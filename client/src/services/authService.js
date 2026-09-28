import api from './api';

export const loginRequest = (username, password) =>
  api.post('/auth/login', { username, password }).then((res) => res.data);

export const logoutRequest = () => api.post('/auth/logout');

export const fetchCurrentUser = () => api.get('/auth/me').then((res) => res.data);

// Devuelve { needsSetup }: true si la app todavía no tiene ningún usuario.
export const fetchSetupStatus = () => api.get('/auth/setup-status').then((res) => res.data);

// Crea el primer usuario (solo funciona si no existe ninguno) y deja la sesión iniciada.
export const setupRequest = (data) => api.post('/auth/setup', data).then((res) => res.data);

export const changePasswordRequest = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });
