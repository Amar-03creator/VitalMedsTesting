import axiosClient from './axiosClient.js';

export const reportApi = {
  getSalesReport: (params) =>
    axiosClient.get('/reports/sales', { params }).then(r => r.data),

  getGSTSummary: (params) =>
    axiosClient.get('/reports/gst-summary', { params }).then(r => r.data),

  getInventoryReport: (params) =>
    axiosClient.get('/reports/inventory', { params }).then(r => r.data),

  getPaymentReport: (params) =>
    axiosClient.get('/reports/payments', { params }).then(r => r.data),

  getReplenishmentForecast: () =>
    axiosClient.get('/reports/replenishment').then(r => r.data),

  getClientReport: (clientId, params) =>
    axiosClient.get(`/reports/client/${clientId}`, { params }).then(r => r.data),

  exportReport: (type, params) =>
    axiosClient.get(`/reports/${type}/export`, {
      params,
      responseType: 'blob',
    }).then(r => r.data),

  getDashboardStats: () =>
    axiosClient.get('/reports/dashboard').then(r => r.data),
};

export default reportApi;
