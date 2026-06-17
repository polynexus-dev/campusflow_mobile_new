export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login" as const,
    REGISTER: "/(auth)/register" as const,
    OTP: "/(auth)/otp" as const,
  },
  APP: {
    DASHBOARD: "/(app)/dashboard" as const,
    REGISTER_FACE: "/(app)/register-face" as const,
    MARK_ATTENDANCE: "/(app)/mark-attendance" as const,
  },
} as const;

export type RouteType = typeof ROUTES;
