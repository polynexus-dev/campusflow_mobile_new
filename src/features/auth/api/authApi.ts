import httpClient from "@services/api/httpClient";

export const authApi = {
  login: async (credentials: Record<string, any>) => {
    // Send username, password to /login/
    const response = await httpClient.post("/login/", credentials);
    return response.data; // { access, refresh, user }
  },

  registerStudent: async (studentData: Record<string, any>) => {
    // Send data to /register/student/
    const response = await httpClient.post("/register/student/", studentData);
    return response.data;
  },

  verifyAccount: async (payload: { email: string; otp: string }) => {
    // Send data to /verify-account/
    const response = await httpClient.post("/verify-account/", payload);
    return response.data;
  },

  resendOTP: async (payload: { email: string }) => {
    // Send data to /resend-otp/
    const response = await httpClient.post("/resend-otp/", payload);
    return response.data;
  },

  resetDeviceLock: async (payload: { student_id: string; reason: string }) => {
    // Send data to /student/reset-device-lock/
    const response = await httpClient.post("/student/reset-device-lock/", payload);
    return response.data;
  },

  forgotPasswordRequestOTP: async (payload: { email: string }) => {
    const response = await httpClient.post("/user/forgot-password/request-otp/", payload);
    return response.data;
  },

  forgotPasswordVerifyOTP: async (payload: { email: string; otp: string }) => {
    const response = await httpClient.post("/user/forgot-password/verify-otp/", payload);
    return response.data;
  },

  forgotPasswordReset: async (payload: Record<string, any>) => {
    const response = await httpClient.post("/user/forgot-password/reset/", payload);
    return response.data;
  },

  grantConsent: async () => {
    const response = await httpClient.post("/user/grant-consent/");
    return response.data;
  },
};
