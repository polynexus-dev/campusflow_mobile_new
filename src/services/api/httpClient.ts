import axios from "axios";
import { buildUrl } from "./buildUrl";
import { useAuthStore } from "@store/authStore";
import { ApiError } from "@/errors/ApiError";
import { logError } from "@/errors/errorHandler";

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

    // Attach tenant schema header for local IP routing
    // The backend CampusFlowTenantMiddleware uses this to switch to the correct tenant schema
    const collegeSchema = useAuthStore.getState().collegeSchema;
    if (collegeSchema) {
      config.headers['X-Tenant'] = collegeSchema;
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
    const statusCode: number = error?.response?.status ?? 500;
    const endpoint: string = error?.config?.url ?? "unknown";
    let message = "An unexpected error occurred.";

    if (error.response) {
      const data = error.response.data;
      if (data && typeof data === "object") {
        if (data.error) message = data.error;
        else if (data.detail) message = data.detail;
        else if (data.message) message = data.message;
        else {
          // Flatten standard DRF serializer errors
          const values = Object.values(data);
          if (values.length > 0) {
            message = String(values[0]);
          }
        }
      }
    } else if (error.request) {
      message = "No response received from the server. Check your network connection.";
    } else if (error.message) {
      message = error.message;
    }

    const responseData = error?.response?.data;
    const apiError = ApiError.fromResponse(statusCode, message, endpoint, responseData);
    logError(apiError, `httpClient:response [${endpoint}]`);

    return Promise.reject(apiError);
  }
);
export default httpClient;
