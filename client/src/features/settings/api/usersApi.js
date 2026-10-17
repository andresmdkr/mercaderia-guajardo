import api from '../../../services/api';

// Usuarios (las personas que usan el programa; todas con los mismos permisos).
// Lista: [{ id, username, name, active, createdAt }]
export const fetchUsers = () => api.get('/users').then((res) => res.data);

export const createUser = (data) => api.post('/users', data).then((res) => res.data);

// Dar de baja (active: false) o reactivar (active: true)
export const setUserActive = (id, active) => api.patch(`/users/${id}/active`, { active }).then((res) => res.data);

// Cambia la contraseña de otra persona
export const resetUserPassword = (id, password) => api.post(`/users/${id}/password`, { password });
