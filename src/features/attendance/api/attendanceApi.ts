import httpClient from "@services/api/httpClient";

export const attendanceApi = {
  registerFace: async (formData: FormData) => {
    // Multipart upload containing front, left, right image files
    const response = await httpClient.post("/register-face/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getLivenessChallenge: async () => {
    // Fetch challenge: returns { challenge_id, challenge_type }
    const response = await httpClient.get("/liveness-challenge/");
    return response.data;
  },

  markAttendance: async (formData: FormData) => {
    // Submit live photo, baseline photo (photo_prev), challenge_id, lecture_id
    const response = await httpClient.post("/mark-attendance/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getHistory: async () => {
    // Get list of previous attendance logs
    const response = await httpClient.get("/attendance-history/");
    return response.data;
  },

  getLectures: async () => {
    // Get all available lectures
    const response = await httpClient.get("/lectures/");
    return response.data;
  },

  requestBiometricReset: async (reason: string = "Request biometric reset") => {
    const response = await httpClient.post("/student/request-biometric-reset/", { reason });
    return response.data;
  },

  getResetRequestStatus: async () => {
    const response = await httpClient.get("/student/request-biometric-reset/");
    return response.data;
  },

  // ── Lecturer Attendance Session Control ──
  lecturerCheckIn: async (lectureId: number, latitude: number, longitude: number) => {
    const response = await httpClient.post("/lecturer/check-in/", {
      lecture_id: lectureId,
      latitude,
      longitude
    });
    return response.data;
  },

  lecturerStartAttendance: async (lectureId: number) => {
    const response = await httpClient.post("/lecturer/start-attendance/", {
      lecture_id: lectureId
    });
    return response.data;
  },

  getLecturerAttendanceStatus: async (lectureId: number) => {
    const response = await httpClient.get(`/lecturer/status/?lecture_id=${lectureId}`);
    return response.data;
  },

  getLecturerManualRequests: async (lectureId: number) => {
    const response = await httpClient.get(`/lecturer/manual-requests/?lecture_id=${lectureId}`);
    return response.data;
  },

  lecturerApproveManualRequest: async (requestId: number, action: "approve" | "reject") => {
    const response = await httpClient.post("/lecturer/approve-manual-request/", {
      request_id: requestId,
      action
    });
    return response.data;
  },

  // ── Student Manual Attendance Request ──
  studentRequestManualAttendance: async (lectureId: number, reason: string) => {
    const response = await httpClient.post("/student/request-manual-attendance/", {
      lecture_id: lectureId,
      reason
    });
    return response.data;
  },

  getStudentManualRequestStatus: async (lectureId: number) => {
    const response = await httpClient.get(`/student/manual-request-status/?lecture_id=${lectureId}`);
    return response.data;
  },

  getLecturerConductedHistory: async (filters?: { year?: number; month?: number; day?: number }) => {
    let url = "/lecturer/conducted-history/";
    const params = [];
    if (filters?.year) params.push(`year=${filters.year}`);
    if (filters?.month) params.push(`month=${filters.month}`);
    if (filters?.day) params.push(`day=${filters.day}`);
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }
    const response = await httpClient.get(url);
    return response.data;
  },

  lecturerBulkApproveManualRequests: async (requestIds: number[], action: "approve" | "reject") => {
    const response = await httpClient.post("/lecturer/bulk-approve-manual-requests/", {
      request_ids: requestIds,
      action
    });
    return response.data;
  },

  getLecturerDeviceResetRequests: async () => {
    const response = await httpClient.get("/lecturer/device-resets/");
    return response.data;
  },

  lecturerApproveDeviceResetRequest: async (requestId: number, action: "approve" | "reject") => {
    const response = await httpClient.post("/lecturer/approve-device-reset/", {
      request_id: requestId,
      action
    });
    return response.data;
  },

  getLecturerDynamicQR: async (lectureId: number) => {
    const response = await httpClient.get(`/lecturer/generate-dynamic-qr/?lecture_id=${lectureId}`);
    return response.data;
  },

  studentVerifyQRAttendance: async (lectureId: number, token: string, deviceId?: string) => {
    const response = await httpClient.post("/student/verify-qr-attendance/", {
      lecture_id: lectureId,
      token,
      device_id: deviceId
    });
    return response.data;
  },
};
