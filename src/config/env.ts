// Support dynamic URL construction with local multi-tenancy helper
const getApiHost = (): string => {
  // Read from the .env file if available, fallback to Android Emulator default loopback
  const host = process.env.EXPO_PUBLIC_API_HOST || "10.0.2.2:8000";
  if (!host.startsWith("http://") && !host.startsWith("https://")) {
    return `http://${host}`;
  }
  return host;
};

export const ENV = {
  getApiUrl: (tenantDomain?: string) => {
    // Always use the base API host. Tenant schema switching is handled
    // dynamically on the backend via the 'X-Tenant' schema header.
    return getApiHost();
  },
  get DEFAULT_PUBLIC_API() {
    return getApiHost();
  },
};
