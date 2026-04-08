import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send cookies for better-auth session
});

export default api;

