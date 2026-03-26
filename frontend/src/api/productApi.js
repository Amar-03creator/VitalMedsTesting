import axiosClient from './axiosClient.js';

export const productApi = {
  getAllProducts: (params) =>
    axiosClient.get('/products', { params }).then(r => r.data),

  getProductById: (id) =>
    axiosClient.get(`/products/${id}`).then(r => r.data),

  createProduct: (data) =>
    axiosClient.post('/products', data).then(r => r.data),

  updateProduct: (id, data) =>
    axiosClient.put(`/products/${id}`, data).then(r => r.data),

  deleteProduct: (id) =>
    axiosClient.delete(`/products/${id}`).then(r => r.data),

  getBatches: (id) =>
    axiosClient.get(`/products/${id}/batches`).then(r => r.data),

  addBatch: (id, batchData) =>
    axiosClient.post(`/products/${id}/batches`, batchData).then(r => r.data),

  updateBatch: (productId, batchId, data) =>
    axiosClient.put(`/products/${productId}/batches/${batchId}`, data).then(r => r.data),

  getLowStock: () =>
    axiosClient.get('/products/low-stock').then(r => r.data),

  getExpiringBatches: (days = 90) =>
    axiosClient.get('/products/expiring', { params: { days } }).then(r => r.data),

  getCategories: () =>
    axiosClient.get('/products/categories').then(r => r.data),
};

export default productApi;
