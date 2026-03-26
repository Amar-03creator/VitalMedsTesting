import axiosClient from './axiosClient.js';

export const orderApi = {
  getAllOrders: (params) =>
    axiosClient.get('/orders', { params }).then(r => r.data),

  getOrderById: (id) =>
    axiosClient.get(`/orders/${id}`).then(r => r.data),

  createOrder: (data) =>
    axiosClient.post('/orders', data).then(r => r.data),

  updateOrder: (id, data) =>
    axiosClient.put(`/orders/${id}`, data).then(r => r.data),

  updateStatus: (id, status, notes) =>
    axiosClient.patch(`/orders/${id}/status`, { status, notes }).then(r => r.data),

  cancelOrder: (id, reason) =>
    axiosClient.patch(`/orders/${id}/cancel`, { reason }).then(r => r.data),

  getOrdersByClient: (clientId, params) =>
    axiosClient.get(`/orders/client/${clientId}`, { params }).then(r => r.data),

  generateInvoice: (id) =>
    axiosClient.post(`/orders/${id}/generate-invoice`).then(r => r.data),

  getMyOrders: (params) =>
    axiosClient.get('/orders/my', { params }).then(r => r.data),
};

export default orderApi;
