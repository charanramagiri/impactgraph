import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 8000,
  headers: {
    Accept: 'application/json',
  },
});

export default api;
