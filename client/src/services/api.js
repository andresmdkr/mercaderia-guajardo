import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Devuelve el mensaje que mandó el backend, o uno genérico si no hubo respuesta.
export function getErrorMessage(error) {
  return error.response?.data?.message ?? 'No se pudo conectar con el servidor';
}

export default api;
