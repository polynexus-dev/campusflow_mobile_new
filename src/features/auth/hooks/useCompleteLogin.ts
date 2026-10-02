import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { hasBusConductorAccess } from "@/utils/busAccess";

/**
 * Everything after a successful /login/ or /login/otp/verify/ call (both
 * return the same payload): save the resolved college, store the session and
 * route by role.
 */
export const useCompleteLogin = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setCollegeDomain = useAuthStore((state) => state.setCollegeDomain);
  const setCollegeSchema = useAuthStore((state) => state.setCollegeSchema);

  const completeLogin = async (response: any, username: string) => {
    // 1. Save resolved college domain & schema dynamically from response
    await setCollegeDomain(response.tenant_domain || null);
    await setCollegeSchema(response.tenant_schema || null);

    // 2. Construct UserProfile and save to auth state
    const userProfile = {
      id: response.user_id,
      username: response.user || username,
      email: response.email || "",
      first_name: response.first_name || "",
      last_name: response.last_name || "",
      role: response.roleName || "student",
      consent_given: response.consent_given ?? true,
      tenant_name: response.tenant?.name || "your institution",
      tenant_logo: response.tenant?.logo || null,
      is_bus_driver: response.is_bus_driver ?? false,
      is_bus_conductor: response.is_bus_conductor ?? false,
      bus_route_id: response.bus_route_id ?? null,
      student_profile: response.profile ? {
        student_id: response.profile.student_id || "",
        is_face_registered: response.profile.is_face_registered ?? false,
        locked_device_id: response.profile.locked_device_id ?? null,
      } : undefined
    };

    await setAuth(userProfile, response.access, response.refresh);

    Alert.alert("Success", `Welcome back, ${userProfile.username}!`);

    // Bus driver/conductor accounts get their own trimmed 3-tab Home /
    // Passengers / Profile experience instead of the student tabs — same
    // gate app/index.tsx and app/_layout.tsx use, since this redirect
    // fires before either of those ever gets a chance to run.
    if (userProfile.role === "guardian") {
      router.replace(ROUTES.APP.GUARDIAN_HOME);
    } else if (hasBusConductorAccess(userProfile)) {
      router.replace(ROUTES.APP.DRIVER_DASHBOARD);
    } else {
      router.replace(ROUTES.APP.DASHBOARD);
    }
  };

  // Reset domain/schema after a failed login so it doesn't get stuck
  const resetCollege = () => {
    setCollegeDomain(null);
    setCollegeSchema(null);
  };

  return { completeLogin, resetCollege };
};
