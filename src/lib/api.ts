import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000/api";

/**
 * ✅ IMPROVED: Better axios instance setup
 * - CSRF protection
 * - Token management
 * - Error logging
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

/**
 * ✅ REQUEST INTERCEPTOR
 * - Setup CSRF token
 * - Add Authorization header
 * - Log requests
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // ✅ STEP 1: Get CSRF token if needed
      if (!document.cookie.includes("XSRF-TOKEN")) {
        console.log("🔒 [API] Getting CSRF token...");
        await axios.get("http://127.0.0.1:8000/sanctum/csrf-cookie", {
          withCredentials: true,
        });
      }

      // ✅ STEP 2: Add auth token from localStorage
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("🔑 [API] Token added to Authorization header");
      } else {
        console.warn("⚠️ [API] No auth token found in localStorage");
      }

      // ✅ STEP 3: Log request
      console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params
      });

      return config;

    } catch (error) {
      console.error("❌ [API] Request interceptor error:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error("❌ [API] Request error:", error);
    return Promise.reject(error);
  }
);

/**
 * ✅ RESPONSE INTERCEPTOR
 * - Log responses
 * - Handle errors
 * - Retry logic (optional)
 */
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API] ${response.status} ${response.config.url}`, {
      data: response.data
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    console.error(`❌ [API] ${status} Error:`, {
      url: error.config?.url,
      method: error.config?.method,
      message,
      data: error.response?.data
    });

    // ✅ HANDLE 401 UNAUTHORIZED
    if (status === 401) {
      console.warn("🔐 [API] Unauthorized - clearing token");
      localStorage.removeItem("auth_token");
      window.location.href = "/auth";
    }

    return Promise.reject(error);
  }
);