import axiosClient from './axiosClient.js';

export const invoiceApi = {
  getAllInvoices: (params) =>
    axiosClient.get('/invoices', { params }).then(r => r.data),

  getInvoiceById: (id) =>
    axiosClient.get(`/invoices/${id}`).then(r => r.data),

  getInvoicesByClient: (clientId, params) =>
    axiosClient.get(`/invoices/client/${clientId}`, { params }).then(r => r.data),

  getMyInvoices: (params) =>
    axiosClient.get('/invoices/my', { params }).then(r => r.data),

  generatePDF: (id) =>
    axiosClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then(r => r.data),

  sendEmail: (id) =>
    axiosClient.post(`/invoices/${id}/send-email`).then(r => r.data),

  getOverdue: () =>
    axiosClient.get('/invoices/overdue').then(r => r.data),

  recordPayment: (id, paymentData) =>
    axiosClient.post(`/invoices/${id}/payment`, paymentData).then(r => r.data),

  getPaymentHistory: (clientId) =>
    axiosClient.get(`/invoices/payments/${clientId}`).then(r => r.data),
};

export default invoiceApi;
