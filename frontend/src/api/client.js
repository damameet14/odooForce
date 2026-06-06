import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vendorbridge_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("vendorbridge_token");
    localStorage.removeItem("vendorbridge_user");
  }
  return Promise.reject(error);
});
export default api;

