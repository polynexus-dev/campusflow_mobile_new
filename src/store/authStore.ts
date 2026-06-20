import { create } from "zustand";
import { storage } from "@services/storage/secureStore";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string; // 'student', 'staff', etc.
  student_profile?: {
    student_id: string;
    is_face_registered: boolean;
    locked_device_id: string | null;
  };
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  collegeDomain: string | null;
  collegeSchema: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  initializeAuth: () => Promise<void>;
  setAuth: (user: UserProfile, token: string) => Promise<void>;
  setCollegeDomain: (domain: string | null) => Promise<void>;
  setCollegeSchema: (schema: string | null) => Promise<void>;
  setDeviceId: (deviceId: string) => Promise<void>;
  updateFaceRegisteredStatus: (status: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  collegeDomain: null,
  collegeSchema: null,
  deviceId: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    try {
      const storedToken = await storage.getItem("cf_token");
      const storedUser = await storage.getItem("cf_user");
      const storedDomain = await storage.getItem("cf_domain");
      const storedSchema = await storage.getItem("cf_schema");
      const storedDeviceId = await storage.getItem("cf_device_id");

      set({
        token: storedToken,
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

  setAuth: async (user, token) => {
    await storage.setItem("cf_token", token);
    await storage.setItem("cf_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
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

  logout: async () => {
    await storage.removeItem("cf_token");
    await storage.removeItem("cf_user");
    // Keep collegeDomain, collegeSchema and deviceId for better UX
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
