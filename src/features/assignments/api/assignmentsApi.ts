import httpClient from "@services/api/httpClient";

export const assignmentsApi = {
  getAssignments: async () => {
    const response = await httpClient.get("/assignments/");
    return response.data;
  },

  getAssignmentDetails: async (id: number | string) => {
    const response = await httpClient.get(`/assignments/${id}/`);
    return response.data;
  },

  getSubmissions: async (assignmentId: number | string) => {
    const response = await httpClient.get(`/assignments/${assignmentId}/submissions/`);
    return response.data;
  },

  submitAssignment: async (
    assignmentId: number | string,
    textSubmission: string,
    fileInfo?: { uri: string; name: string; type: string }
  ) => {
    const formData = new FormData();
    if (textSubmission) {
      formData.append("text_submission", textSubmission);
    }
    if (fileInfo) {
      formData.append("attachment", {
        uri: fileInfo.uri,
        name: fileInfo.name || "submission.pdf",
        type: fileInfo.type || "application/pdf",
      } as any);
    }

    const response = await httpClient.post(`/assignments/${assignmentId}/submissions/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
