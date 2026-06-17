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
};
