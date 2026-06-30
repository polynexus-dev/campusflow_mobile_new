import httpClient from "@services/api/httpClient";

export interface BusStop {
  name: string;
  lat: number;
  lng: number;
  expected: number;
  boarded: number;
  absent: number;
}

export interface DriverDashboardData {
  route_id: number;
  route_name: string;
  qr_token: string;
  expected_total: number;
  boarded_total: number;
  absent_total: number;
  stops: BusStop[];
}

export interface LiveBusData {
  driver_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  distance_km: number;
  route: {
    id: number;
    name: string;
    stops: { name: string; lat: number; lng: number }[];
  } | null;
  last_seen: string;
}

export const busApi = {
  // Conductor endpoints
  getDriverDashboard: async (): Promise<DriverDashboardData> => {
    const res = await httpClient.get("api/bus/driver/dashboard/");
    return res.data;
  },

  // Student endpoints
  getLiveBuses: async (): Promise<LiveBusData[]> => {
    const res = await httpClient.get("api/bus/live/");
    return res.data;
  },

  scanBoardingQR: async (qrToken: string, deviceId: string) => {
    const res = await httpClient.post("api/bus/scan/", {
      qr_token: qrToken,
      device_id: deviceId,
    });
    return res.data;
  },

  getSubscriptions: async () => {
    const res = await httpClient.get("api/bus/subscriptions/");
    return res.data;
  },
};
