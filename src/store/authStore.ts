import { create } from "zustand";
import { storage } from "@services/storage/secureStore";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string; // 'student', 'staff', etc.
  consent_given?: boolean;
  tenant_name?: string;
  tenant_logo?: string | null;
  // "Additional charge" — set only when the backend has assigned this user
  // (typically a Support Staff employee) as the driver/conductor of an
  // active BusRoute. Independent of `role`, since drivers/conductors are
  // still base-role Support Staff employees.
  is_bus_driver?: boolean;
  is_bus_conductor?: boolean;
  bus_route_id?: number | null;
  student_profile?: {
    student_id: string;
    is_face_registered: boolean;
    locked_device_id: string | null;
  };
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  collegeDomain: string | null;
  collegeSchema: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  initializeAuth: () => Promise<void>;
  setAuth: (user: UserProfile, token: string, refreshToken?: string | null) => Promise<void>;
  setTokens: (token: string, refreshToken?: string | null) => Promise<void>;
  setCollegeDomain: (domain: string | null) => Promise<void>;
  setCollegeSchema: (schema: string | null) => Promise<void>;
  setDeviceId: (deviceId: string) => Promise<void>;
  updateFaceRegisteredStatus: (status: boolean) => void;
  updateConsentStatus: (status: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  collegeDomain: null,
  collegeSchema: null,
  deviceId: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    try {
      const storedToken = await storage.getItem("cf_token");
      const storedRefresh = await storage.getItem("cf_refresh");
      const storedUser = await storage.getItem("cf_user");
      const storedDomain = await storage.getItem("cf_domain");
      const storedSchema = await storage.getItem("cf_schema");
      const storedDeviceId = await storage.getItem("cf_device_id");

      set({
        token: storedToken,
        refreshToken: storedRefresh,
        user: storedUser ? JSON.parse(storedUser) : null,
        collegeDomain: storedDomain,
        collegeSchema: storedSchema,
        deviceId: storedDeviceId,
        isAuthenticated: !!storedToken,
        isLoading: false,
      });
    } catch (error) {
      console.error("Auth initialization failed", error);
      set({ isLoading: false });
    }
  },

  setAuth: async (user, token, refreshToken) => {
    await storage.setItem("cf_token", token);
    if (refreshToken) await storage.setItem("cf_refresh", refreshToken);
    await storage.setItem("cf_user", JSON.stringify(user));
    set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true });
  },

  // Called after a token refresh (the backend rotates the refresh token too).
  setTokens: async (token, refreshToken) => {
    await storage.setItem("cf_token", token);
    if (refreshToken) await storage.setItem("cf_refresh", refreshToken);
    set((state) => ({ token, refreshToken: refreshToken ?? state.refreshToken }));
  },

  setCollegeDomain: async (domain) => {
    if (domain) {
      await storage.setItem("cf_domain", domain);
    } else {
      await storage.removeItem("cf_domain");
    }
    set({ collegeDomain: domain });
  },

  setCollegeSchema: async (schema) => {
    if (schema) {
      await storage.setItem("cf_schema", schema);
    } else {
      await storage.removeItem("cf_schema");
    }
    set({ collegeSchema: schema });
  },

  setDeviceId: async (deviceId) => {
    await storage.setItem("cf_device_id", deviceId);
    set({ deviceId });
  },

  updateFaceRegisteredStatus: (status) => {
    const currentUser = get().user;
    if (currentUser && currentUser.student_profile) {
      const updatedUser = {
        ...currentUser,
        student_profile: {
          ...currentUser.student_profile,
          is_face_registered: status,
        },
      };
      storage.setItem("cf_user", JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  updateConsentStatus: (status) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        consent_given: status,
      };
      storage.setItem("cf_user", JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  logout: async () => {
    await storage.removeItem("cf_token");
    await storage.removeItem("cf_refresh");
    await storage.removeItem("cf_user");
    // collegeSchema must not survive logout: httpClient attaches it as the
    // X-Tenant header on every request including the next login attempt,
    // and the backend's login endpoint rejects any request that isn't on
    // the public schema — so a stale schema here permanently locks the
    // device out of logging back in as anyone, on any college.
    await storage.removeItem("cf_domain");
    await storage.removeItem("cf_schema");
    // deviceId is kept — it's the biometric device-lock fingerprint and must
    // stay stable across logins on the same physical device.
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, collegeDomain: null, collegeSchema: null });
  },
}));
