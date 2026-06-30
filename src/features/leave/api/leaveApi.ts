import httpClient from "@services/api/httpClient";

export const leaveApi = {
  getLeaveBalances: async () => {
    const response = await httpClient.get("/leave/balance/");
    return response.data;
  },

  getMyLeaves: async () => {
    const response = await httpClient.get("/leave/my/");
    return response.data;
  },

  getPendingRequests: async () => {
    const response = await httpClient.get("/leave/requests/");
    return response.data;
  },

  createLeaveRequest: async (data: {
    leave_type_id: number;
    start_date: string;
    end_date: string;
    reason: string;
  }) => {
    const response = await httpClient.post("/leave/request/", data);
    return response.data;
  },

  actionLeaveRequest: async (requestId: number, action: "approve" | "reject") => {
    const response = await httpClient.post("/leave/action/", {
      request_id: requestId,
      action
    });
    return response.data;
  },

  getLeaveTypes: async () => {
    const response = await httpClient.get("/leave/types/");
    return response.data;
  }
};
