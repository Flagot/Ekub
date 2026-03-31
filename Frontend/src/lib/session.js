export const TOKEN_KEY = "ekub_token";

export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent("ekub-auth-changed"));
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("ekub-auth-changed"));
};

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};
