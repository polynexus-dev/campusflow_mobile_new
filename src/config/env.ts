import Constants from "expo-constants";

// Default localhost IP for Android Emulator (10.0.2.2) or iOS Simulator (localhost)
const DEFAULT_DEV_IP = "10.0.2.2"; 
const DEFAULT_PORT = "8000";

// Support dynamic URL construction
export const ENV = {
  DEV_HOST: DEFAULT_DEV_IP,
  PORT: DEFAULT_PORT,
  getApiUrl: (tenantDomain?: string) => {
    // If we have a tenant subdomain, e.g., 'mit.localhost:8000' or 'mit.campusflow.com'
    if (tenantDomain) {
      return `http://${tenantDomain}/api`;
    }
    return `http://${DEFAULT_DEV_IP}:${DEFAULT_PORT}/api`;
  },
  DEFAULT_PUBLIC_API: `http://${DEFAULT_DEV_IP}:${DEFAULT_PORT}/api`,
};
