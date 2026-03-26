import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor – attach Bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vitalmeds_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – normalise errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    }

    const { status, data } = error.response;

    if (status === 401) {
      localStorage.removeItem('vitalmeds_token');
      window.location.href = '/login';
      return Promise.reject({ message: 'Session expired. Please log in again.', code: 401 });
    }

    if (status === 403) {
      window.location.href = '/unauthorized';
      return Promise.reject({ message: 'You do not have permission to perform this action.', code: 403 });
    }

    return Promise.reject({
      message: data?.message || data?.error || `Request failed with status ${status}`,
      code:    status,
      data:    data,
    });
  }
);

export default axiosClient;
