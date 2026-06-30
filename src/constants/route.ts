export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login" as const,
    REGISTER: "/(auth)/register" as const,
    OTP: "/(auth)/otp" as const,
  },
  APP: {
    DASHBOARD: "/(app)/dashboard" as const,
    PROFILE: "/(app)/profile" as const,
    REGISTER_FACE: "/(app)/register-face" as const,
    MARK_ATTENDANCE: "/(app)/mark-attendance" as const,
    TIMETABLE: "/(app)/timetable" as const,
    ASSIGNMENTS: "/(app)/assignments" as const,
    ASSIGNMENT_DETAILS: "/(app)/assignments/[id]" as const,
    ATTENDANCE_HISTORY: "/(app)/attendance-history" as const,
    LECTURER_HISTORY: "/(app)/lecturer-history" as const,
    BUS_TRACKING: "/(app)/bus-tracking" as const,
    FEES: "/(app)/student-fees" as const,
  },
} as const;



export type RouteType = typeof ROUTES;
