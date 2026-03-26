import axiosClient from './axiosClient.js';

export const clientApi = {
  getAllClients: (params) =>
    axiosClient.get('/clients', { params }).then(r => r.data),

  getClientById: (id) =>
    axiosClient.get(`/clients/${id}`).then(r => r.data),

  createClient: (data) =>
    axiosClient.post('/clients', data).then(r => r.data),

  updateClient: (id, data) =>
    axiosClient.put(`/clients/${id}`, data).then(r => r.data),

  deleteClient: (id) =>
    axiosClient.delete(`/clients/${id}`).then(r => r.data),

  updateStatus: (id, status, reason) =>
    axiosClient.patch(`/clients/${id}/status`, { status, reason }).then(r => r.data),

  updateCreditLimit: (id, creditLimit) =>
    axiosClient.patch(`/clients/${id}/credit-limit`, { creditLimit }).then(r => r.data),

  uploadKYC: (id, formData) =>
    axiosClient.post(`/clients/${id}/kyc`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  reviewKYC: (id, status, notes) =>
    axiosClient.patch(`/clients/${id}/kyc/review`, { status, notes }).then(r => r.data),

  getClientBalance: (id) =>
    axiosClient.get(`/clients/${id}/balance`).then(r => r.data),
};

export default clientApi;
