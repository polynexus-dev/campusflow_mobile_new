import axios from "axios";
import { buildUrl } from "./buildUrl";
import { useAuthStore } from "@store/authStore";

export const httpClient = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Interceptor for resolving URLs dynamically and attaching authorization tokens
httpClient.interceptors.request.use(
  (config) => {
    if (config.url && !config.url.startsWith("http")) {
      config.url = buildUrl(config.url);
    }

    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor for normalizing errors
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let normalizedError = {
      message: "An unexpected error occurred.",
      status: error.response?.status,
      data: error.response?.data,
    };

    if (error.response) {
      const data = error.response.data;
      if (data && typeof data === "object") {
        if (data.error) normalizedError.message = data.error;
        else if (data.detail) normalizedError.message = data.detail;
        else if (data.message) normalizedError.message = data.message;
        else {
          // Flatten standard DRF serializer errors
          const values = Object.values(data);
          if (values.length > 0) {
            normalizedError.message = String(values[0]);
          }
        }
      }
    } else if (error.request) {
      normalizedError.message = "No response received from the server. Check your network connection.";
    }

    return Promise.reject(normalizedError);
  }
);
export default httpClient;
