// Support dynamic URL construction with local multi-tenancy helper
const getApiHost = (): string => {
  // Read from the .env file if available, fallback to Android Emulator default loopback
  return process.env.EXPO_PUBLIC_API_HOST || "10.0.2.2:8000";
};

export const ENV = {
  getApiUrl: (tenantDomain?: string) => {
    const apiHost = getApiHost();
    
    if (tenantDomain) {
      // If we are in local development (using localhost, 127.0.0.1, or raw IP like 192.168.1.195),
      // we cannot prepend subdomains (e.g. mit.192.168.1.195) because it's an invalid DNS hostname.
      // Instead, we hit the base API host directly and let header-based routing (X-Tenant) handle schema switching.
      const isLocal = apiHost.includes("localhost") || 
                      apiHost.includes("127.0.0.1") || 
                      /^\d+\.\d+\.\d+\.\d+/.test(apiHost);
                      
      if (isLocal) {
        return `http://${apiHost}/api`;
      }
      
      return `http://${tenantDomain}/api`;
    }
    
    return `http://${apiHost}/api`;
  },
  
  get DEFAULT_PUBLIC_API() {
    return `http://${getApiHost()}/api`;
  },
};
