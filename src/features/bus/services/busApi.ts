import httpClient from "@services/api/httpClient";

export interface BusStop {
  name: string;
  lat: number;
  lng: number;
  expected: number;
  boarded: number;
  absent: number;
}

export interface BusPassenger {
  user_id: number;
  name: string;
  role: string;
  boarding_stop: string;
  boarded_today: boolean;
  balance_fee: number | null;
  fee_status: "pending" | "paid" | "payroll_deduction";
}

export interface DriverDashboardData {
  route_id: number;
  route_name: string;
  qr_token: string;
  expected_total: number;
  boarded_total: number;
  absent_total: number;
  stops: BusStop[];
  passengers: BusPassenger[];
  total_pending_bus_dues: number;
}

export interface TripStats {
  trips_this_week: number;
  distance_this_week_km: number;
  trips_this_month: number;
  distance_this_month_km: number;
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
  // False for the placeholder the backend returns (parked at the first stop)
  // when no driver is broadcasting. Only a live bus should get an ETA.
  is_live?: boolean;
}

export const busApi = {
  // Conductor endpoints
  getDriverDashboard: async (): Promise<DriverDashboardData> => {
    const res = await httpClient.get("api/bus/driver/dashboard/");
    return res.data;
  },

  startTrip: async (): Promise<{ trip_id: number; started_at: string }> => {
    const res = await httpClient.post("api/bus/driver/trip/start/");
    return res.data;
  },

  endTrip: async (): Promise<{ trip_id: number; ended_at: string; distance_km: number }> => {
    const res = await httpClient.post("api/bus/driver/trip/end/");
    return res.data;
  },

  getTripStats: async (): Promise<TripStats> => {
    const res = await httpClient.get("api/bus/driver/trip-stats/");
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
