import axios from 'axios';

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Auth endpoints returning 401 mean the credentials were wrong —
      // NOT an expired session. Let the error propagate to the component's
      // catch block so the user sees the specific reason without a reload.
      const url = err.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/signup');
      if (!isAuthEndpoint) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
