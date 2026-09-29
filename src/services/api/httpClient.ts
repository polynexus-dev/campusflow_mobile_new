// import axios from "axios";
// import { buildUrl } from "./buildUrl";
// import { useAuthStore } from "@store/authStore";
// import { ApiError } from "@/errors/ApiError";
// import { logError } from "@/errors/errorHandler";

// export const httpClient = axios.create({
//   timeout: 15000,
//   headers: {
//     "Content-Type": "application/json",
//     "Accept": "application/json",
//   },
// });

// // Interceptor for resolving URLs dynamically and attaching authorization tokens
// httpClient.interceptors.request.use(
//   (config) => {
//     if (config.url && !config.url.startsWith("http")) {
//       config.url = buildUrl(config.url);
//     }

//     const token = useAuthStore.getState().token;
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     // Attach tenant schema header for local IP routing
//     // The backend CampusFlowTenantMiddleware uses this to switch to the correct tenant schema
//     const collegeSchema = useAuthStore.getState().collegeSchema;
//     if (collegeSchema) {
//       config.headers['X-Tenant'] = collegeSchema;
//     }

//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Interceptor for normalizing errors
// httpClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const statusCode: number = error?.response?.status ?? 500;
//     const endpoint: string = error?.config?.url ?? "unknown";
//     let message = "An unexpected error occurred.";

//     if (error.response) {
//       const data = error.response.data;
//       if (data && typeof data === "object") {
//         if (data.error) message = data.error;
//         else if (data.detail) message = data.detail;
//         else if (data.message) message = data.message;
//         else {
//           // Flatten standard DRF serializer errors
//           const values = Object.values(data);
//           if (values.length > 0) {
//             message = String(values[0]);
//           }
//         }
//       }
//     } else if (error.request) {
//       message = "No response received from the server. Check your network connection.";
//     } else if (error.message) {
//       message = error.message;
//     }

//     const responseData = error?.response?.data;
//     const apiError = ApiError.fromResponse(statusCode, message, endpoint, responseData);
//     logError(apiError, `httpClient:response [${endpoint}]`);

//     // Handle session expiry / token invalidation
//     if (statusCode === 401) {
//       const isLoginRequest = endpoint.includes("/login/");
//       if (!isLoginRequest) {
//         try {
//           await useAuthStore.getState().logout();
//         } catch (logoutError) {
//           console.error("Failed to automatically logout after 401 error", logoutError);
//         }
//       }
//     }

//     return Promise.reject(apiError);
//   }
// );
// export default httpClient;



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
    // Auto-remove static Content-Type header for FormData so React Native/Axios generates boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// ── Session renewal ──────────────────────────────────────────────────────
// Access tokens last 8 hours. On a 401 we swap the refresh token for a new
// pair once (concurrent 401s share one refresh call) and retry the request;
// only if that fails does the user get logged out below.
const NO_REFRESH_ENDPOINTS = ["/login/", "/token/refresh/", "/token/verify/"];
let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  const { refreshToken, collegeSchema, setTokens } = useAuthStore.getState();
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(
        buildUrl("api/token/refresh/"),
        { refresh: refreshToken },
        { headers: collegeSchema ? { "X-Tenant": collegeSchema } : {}, timeout: 15000 }
      )
      .then(async (res) => {
        await setTokens(res.data.access, res.data.refresh);
        return res.data.access as string;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// Interceptor for normalizing errors
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const statusCode: number = error?.response?.status ?? 500;
    const endpoint: string = error?.config?.url ?? "unknown";
    const originalConfig = error?.config;
    if (
      statusCode === 401 &&
      originalConfig &&
      !originalConfig._retried &&
      !NO_REFRESH_ENDPOINTS.some((e) => endpoint.includes(e))
    ) {
      originalConfig._retried = true;
      try {
        const access = await refreshAccessToken();
        originalConfig.headers = { ...originalConfig.headers, Authorization: `Bearer ${access}` };
        return httpClient(originalConfig);
      } catch {
        // fall through: normal error handling + logout below
      }
    }
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
    // Handle session expiry / token invalidation
    if (statusCode === 401) {
      const isLoginRequest = endpoint.includes("/login/");
      if (!isLoginRequest) {
        try {
          await useAuthStore.getState().logout();
        } catch (logoutError) {
          console.error("Failed to automatically logout after 401 error", logoutError);
        }
      }
    }
    return Promise.reject(apiError);
  }
);
export default httpClient;