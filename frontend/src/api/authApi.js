import axiosClient from './axiosClient.js';

export const authApi = {
  login: (email, password) =>
    axiosClient.post('/auth/login', { email, password }).then(r => r.data),

  register: (data) =>
    axiosClient.post('/auth/register', data).then(r => r.data),

  logout: () =>
    axiosClient.post('/auth/logout').then(r => r.data),

  getMe: () =>
    axiosClient.get('/auth/me').then(r => r.data),

  updateProfile: (data) =>
    axiosClient.put('/auth/profile', data).then(r => r.data),

  changePassword: (currentPassword, newPassword) =>
    axiosClient.post('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),

  forgotPassword: (email) =>
    axiosClient.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token, newPassword) =>
    axiosClient.post('/auth/reset-password', { token, newPassword }).then(r => r.data),
};

export default authApi;
