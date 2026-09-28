import api from './api';

export const loginRequest = (username, password) =>
  api.post('/auth/login', { username, password }).then((res) => res.data);

export const logoutRequest = () => api.post('/auth/logout');

export const fetchCurrentUser = () => api.get('/auth/me').then((res) => res.data);
