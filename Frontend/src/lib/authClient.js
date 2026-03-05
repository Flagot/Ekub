import apiClient from "../apiClient";

export const TOKEN_KEY = "ekub_token";

export const authClient = {
  async login(payload) {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },
  async register(payload) {
    const { data } = await apiClient.post("/auth/register", payload);
    return data;
  },
  async me() {
    const { data } = await apiClient.get("/auth/me");
    return data;
  },
};

export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};
