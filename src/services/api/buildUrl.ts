import { ENV } from "@/config/env";
import { useAuthStore } from "@store/authStore";

export function buildUrl(endpoint: string): string {
  const domain = useAuthStore.getState().collegeDomain;
  let baseUrl = ENV.getApiUrl(domain || undefined);
  
  // Clean trailing slash of baseUrl if it exists
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  // Ensure leading slash for cleaning
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Automatically prefix /api if not already present and not a static/media asset
  if (
    !cleanEndpoint.startsWith("/api/") &&
    !cleanEndpoint.startsWith("/media/") &&
    !cleanEndpoint.startsWith("/static/")
  ) {
    cleanEndpoint = `/api${cleanEndpoint}`;
  }

  return `${baseUrl}${cleanEndpoint}`;
}
