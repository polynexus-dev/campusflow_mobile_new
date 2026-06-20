import httpClient from "@services/api/httpClient";

export const timetableApi = {
  getSchedules: async (dayOfWeek?: string) => {
    const params = dayOfWeek ? { day_of_week: dayOfWeek } : {};
    const response = await httpClient.get("/schedules/", { params });
    return response.data;
  },
};
