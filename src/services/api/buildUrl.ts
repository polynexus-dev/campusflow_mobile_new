import { ENV } from "@/config/env";
import { useAuthStore } from "@store/authStore";

export function buildUrl(endpoint: string): string {
  const domain = useAuthStore.getState().collegeDomain;
  const baseUrl = ENV.getApiUrl(domain || undefined);
  
  // Clean endpoint prefix
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}
