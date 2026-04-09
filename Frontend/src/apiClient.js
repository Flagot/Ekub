import axios from 'axios';

function buildApiBaseURL() {
  const raw = import.meta.env.VITE_API_URL || '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  // When VITE_API_URL is empty, rely on Vite proxy: "/api" -> backend.
  if (!trimmed) return '/api';
  // Otherwise, call the backend directly.
  return `${trimmed}/api`;
}

const api = axios.create({
  baseURL: buildApiBaseURL(),
  withCredentials: true, // send cookies for better-auth session
});

export default api;

