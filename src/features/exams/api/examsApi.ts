import httpClient from "@services/api/httpClient";

export const examsApi = {
  getExams: async (params?: { department?: number; status?: string; exam_type?: number }) => {
    const response = await httpClient.get("/exams/", { params });
    return response.data;
  },

  getExamDetails: async (id: number | string) => {
    const response = await httpClient.get(`/exams/${id}/`);
    return response.data;
  }
};
