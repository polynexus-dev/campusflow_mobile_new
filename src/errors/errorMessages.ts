export const errorMessages = {
  NETWORK_ERROR: "No internet connection. Please check your network.",
  TIMEOUT: "Request timed out. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER_ERROR: "Something went wrong on our end. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNKNOWN: "An unexpected error occurred.",

  // Auth
  INVALID_CREDENTIALS: "Invalid email or password.",
  OTP_EXPIRED: "The OTP has expired. Please request a new one.",
  OTP_INVALID: "Invalid OTP. Please check and try again.",

  // Attendance
  ALREADY_MARKED: "Attendance already marked for this session.",
  SESSION_EXPIRED: "The session has expired.",
  OUTSIDE_GEOFENCE: "You are outside the allowed area to mark attendance.",
} as const;

export type ErrorMessageKey = keyof typeof errorMessages;
