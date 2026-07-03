import { ENV } from "@/config/env";
import { useAuthStore } from "@store/authStore";

export function buildUrl(endpoint: string): string {
  const domain = useAuthStore.getState().collegeDomain;
  let baseUrl = ENV.getApiUrl(domain || undefined);
  
  // Clean trailing slash of baseUrl if it exists
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  // Clean endpoint prefix
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}
