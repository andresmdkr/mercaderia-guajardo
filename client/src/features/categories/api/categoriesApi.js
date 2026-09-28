import api from '../../../services/api';

export const fetchCategories = () => api.get('/categories').then((res) => res.data);

export const createCategory = (name) => api.post('/categories', { name }).then((res) => res.data);

export const updateCategory = (id, name) => api.put(`/categories/${id}`, { name }).then((res) => res.data);

export const deleteCategory = (id) => api.delete(`/categories/${id}`);
