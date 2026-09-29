import api from '../../../services/api';

export const fetchSummary = (params) => api.get('/reports/summary', { params }).then((res) => res.data);

export const fetchTopProducts = (params) => api.get('/reports/top-products', { params }).then((res) => res.data);

export const fetchLowStock = (params) => api.get('/reports/low-stock', { params }).then((res) => res.data);

export const fetchPaymentMethods = (params) => api.get('/reports/payment-methods', { params }).then((res) => res.data);

export const fetchTopCustomers = (params) => api.get('/reports/top-customers', { params }).then((res) => res.data);

// Cierre de caja de un día (AAAA-MM-DD): { date, salesCount, total, discounts, methods: [{ method, salesCount, total }], voided: { count, total } }
export const fetchCashClose = (date) => api.get('/reports/cash-close', { params: { date } }).then((res) => res.data);
