import httpClient from "@services/api/httpClient";

export const announcementsApi = {
  getAnnouncements: async () => {
    const response = await httpClient.get("/announcements/");
    return response.data;
  },

  createAnnouncement: async (data: {
    title: string;
    description: string;
    category: string;
    target_audience?: string;
  }) => {
    const response = await httpClient.post("/announcements/", data);
    return response.data;
  }
};
