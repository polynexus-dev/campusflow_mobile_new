import httpClient from "@services/api/httpClient";

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  category: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: async (params?: { unread?: boolean; limit?: number }): Promise<AppNotification[]> => {
    const response = await httpClient.get("api/notifications/", {
      params: { limit: params?.limit ?? 50, ...(params?.unread ? { unread: "true" } : {}) },
    });
    return response.data.results || [];
  },

  unreadCount: async (): Promise<number> => {
    const response = await httpClient.get("api/notifications/unread-count/");
    return response.data.unread_count || 0;
  },

  markRead: async (id: number): Promise<void> => {
    await httpClient.post(`api/notifications/${id}/read/`);
  },
};
