import { AppError } from "./AppError";
import { ApiError } from "./ApiError";
import { errorMessages } from "./errorMessages";

/**
 * Normalise any thrown value into a human-readable message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Check if it's a network or connection issue wrapped inside ApiError
    const msgLower = (error.message || "").toLowerCase();
    if (
      msgLower.includes("network") ||
      msgLower.includes("no response") ||
      msgLower.includes("check your network")
    ) {
      return errorMessages.NETWORK_ERROR;
    }
    if (msgLower.includes("timeout")) {
      return errorMessages.TIMEOUT;
    }

    if (error.data && typeof error.data === "object") {
      const messages: string[] = [];
      for (const key of Object.keys(error.data)) {
        const val = error.data[key];
        if (Array.isArray(val)) {
          messages.push(...val.map(String));
        } else if (typeof val === "string") {
          messages.push(val);
        }
      }
      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    switch (error.statusCode) {
      case 401:
        return errorMessages.UNAUTHORIZED;
      case 403:
        return errorMessages.FORBIDDEN;
      case 404:
        return errorMessages.NOT_FOUND;
      case 429:
        return error.message || "Too many requests. Please try again later.";
      case 500:
        return errorMessages.SERVER_ERROR;
      default:
        return error.message || errorMessages.UNKNOWN;
    }
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    const msgLower = error.message.toLowerCase();
    if (msgLower.includes("network")) {
      return errorMessages.NETWORK_ERROR;
    }
    if (msgLower.includes("timeout")) {
      return errorMessages.TIMEOUT;
    }
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const errorObj = error as { message: string };
    const msgLower = (errorObj.message || "").toLowerCase();
    if (msgLower.includes("network") || msgLower.includes("no response")) {
      return errorMessages.NETWORK_ERROR;
    }
    return errorObj.message;
  }

  return errorMessages.UNKNOWN;
}

/**
 * Log error to console (extend to remote logging when needed).
 */
export function logError(error: unknown, context?: string): void {
  if (__DEV__) {
    console.error(`[ErrorHandler]${context ? ` [${context}]` : ""}`, error);
  }
}
