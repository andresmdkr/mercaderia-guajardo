import api from '../../../services/api';

export const fetchCustomers = (params) => api.get('/customers', { params }).then((res) => res.data);

export const createCustomer = (data) => api.post('/customers', data).then((res) => res.data);

export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then((res) => res.data);

export const setCustomerActive = (id, active) =>
  api.patch(`/customers/${id}/status`, { active }).then((res) => res.data);

// Devuelve { duplicate: { id, name } | null }
export const checkCustomerPhone = (phone, excludeId) =>
  api.get('/customers/phone-check', { params: { phone, excludeId } }).then((res) => res.data);
