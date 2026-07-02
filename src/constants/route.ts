export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login" as const,
    REGISTER: "/(auth)/register" as const,
    OTP: "/(auth)/otp" as const,
  },
  APP: {
    DASHBOARD: "/(student)/(tabs)/dashboard" as const,
    PROFILE: "/(student)/(tabs)/profile" as const,
    REGISTER_FACE: "/(student)/register-face" as const,
    MARK_ATTENDANCE: "/(student)/mark-attendance" as const,
    TIMETABLE: "/(student)/(tabs)/timetable" as const,
    ASSIGNMENTS: "/(student)/(tabs)/assignments" as const,
    ASSIGNMENT_DETAILS: "/(student)/assignments/[id]" as const,
    ATTENDANCE_HISTORY: "/(student)/attendance-history" as const,
    LECTURER_HISTORY: "/(student)/lecturer-history" as const,
    BUS_TRACKING: "/(student)/bus-tracking" as const,
    FEES: "/(student)/student-fees" as const,
  },
} as const;



export type RouteType = typeof ROUTES;
