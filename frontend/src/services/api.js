
import axios from "axios";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://nazeergarments.onrender.com/api"
).replace(/\/$/, "");

const ACCESS_KEY = "zg_access";
const REFRESH_KEY = "zg_refresh";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const saveTokens = (access, refresh) => {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const getAccessToken = () =>
  localStorage.getItem(ACCESS_KEY);

export const getRefreshToken = () =>
  localStorage.getItem(REFRESH_KEY);

// Attach access token to requests
api.interceptors.request.use((config) => {
  const token = getAccessToken();

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Shared refresh request prevents duplicate token rotation
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = getRefreshToken();

      if (!refresh) {
        throw new Error("Refresh token not available.");
      }

      const response = await axios.post(
        `${API_BASE_URL}/auth/token/refresh/`,
        { refresh },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const { access, refresh: newRefresh } = response.data;

      if (!access) {
        throw new Error("Access token missing from refresh response.");
      }

      localStorage.setItem(ACCESS_KEY, access);

      if (newRefresh) {
        localStorage.setItem(REFRESH_KEY, newRefresh);
      }

      return access;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

// Handle expired access tokens
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";

    const excludedEndpoints = [
      "/auth/login/",
      "/auth/register/",
      "/auth/logout/",
      "/auth/token/refresh/",
    ];

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      excludedEndpoints.some((endpoint) => url.includes(endpoint))
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const access = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${access}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearTokens();

      window.dispatchEvent(
        new Event("zg-auth-expired")
      );

      return Promise.reject(refreshError);
    }
  }
);
export default api;