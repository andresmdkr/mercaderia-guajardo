import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Devuelve el mensaje que mandó el backend, o uno genérico si no hubo respuesta.
export function getErrorMessage(error) {
  return error.response?.data?.message ?? 'No se pudo conectar con el servidor';
}

// El store registra acá qué hacer ante un 401 (así api.js no depende de Redux).
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error.config?.url === '/auth/login';
    if (error.response?.status === 401 && !isLogin) onUnauthorized();
    return Promise.reject(error);
  }
);

export default api;
