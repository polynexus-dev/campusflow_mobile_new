import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { busApi, DriverDashboardData, BusStop, TripStats } from "../services/busApi";
import { COLORS } from "@/shared/theme/colors";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@store/authStore";
import { buildUrl } from "@services/api/buildUrl";
import { ROUTES } from "@/constants/route";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";

export const ConductorScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DriverDashboardData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tripStats, setTripStats] = useState<TripStats | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const token = useAuthStore((state) => state.token);
  const collegeSchema = useAuthStore((state) => state.collegeSchema);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await busApi.getDriverDashboard();
      setDashboard(data);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Route Error", err.message || "Failed to load driver dashboard. Check route assignment.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTripStats = async () => {
    try {
      const stats = await busApi.getTripStats();
      setTripStats(stats);
    } catch (err) {
      console.error("Failed to load trip stats:", err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchTripStats();
    return () => {
      stopTracking();
    };
  }, []);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permissions are required to stream bus coordinates.");
      return;
    }

    try {
      // Connect to WebSocket using buildUrl utility
      // WebSocket URL starts with ws:// or wss:// depending on secure hosting
      // Connect to WebSocket using buildUrl utility with token and schema parameters
      const httpUrl = buildUrl(`ws/bus-tracking/?token=${token}&schema=${collegeSchema}`);
      const wsUrl = httpUrl.replace(/^http/, "ws");

      console.log("[WS Conductor] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS Conductor] WebSocket connected");
        setIsTracking(true);
        // Stream continuously as the device moves, instead of a fixed interval —
        // gives the rider-facing map a live, gliding position like Uber/Zomato
        // instead of a bus that teleports every 10s.
        beginWatching();
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "location_ack") {
            console.log("[WS Conductor] Ack received:", data.distance_km, "km traveled");
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onerror = (e) => {
        console.error("[WS Conductor] Error:", e);
      };

      ws.onclose = () => {
        console.log("[WS Conductor] WebSocket closed");
        stopTracking();
      };

      socketRef.current = ws;
    } catch (err: any) {
      Alert.alert("Connection Error", "Failed to connect to the tracking server.");
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const beginWatching = async () => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }

    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setCurrentCoords({ lat, lng });

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              lat,
              lng,
              token, // authentication inside consumer if needed
              schema: collegeSchema,
            })
          );
        }
      }
    );

    watcherRef.current = watcher;
  };

  const handleTrackingToggle = (value: boolean) => {
    if (value) {
      busApi.startTrip().catch((err) => console.error("Failed to log trip start:", err));
      startTracking();
    } else {
      stopTracking();
      busApi
        .endTrip()
        .then(() => fetchTripStats())
        .catch((err) => console.error("Failed to log trip end:", err));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No active route assigned to your conductor account.</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper
      title="My Dashboard"
      showHeader={true}
      showBack={false}
      right={
        <TouchableOpacity onPress={() => router.push(ROUTES.APP.LEAVE)} hitSlop={10}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      }
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollable={true}
    >
      {/* Route Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Active Route</Text>
        <Text style={styles.routeName}>{dashboard.route_name}</Text>
      </View>

      {/* Trip Controller Panel */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Controller</Text>
        <Text style={styles.cardSubtitle}>
          {isTracking
            ? `🔴 Streaming Live Location (${currentCoords?.lat.toFixed(5)}, ${currentCoords?.lng.toFixed(5)})`
            : "Bus is currently stationary/offline"}
        </Text>
        
        <View style={styles.tripActionsRow}>
          {!isTracking ? (
            <TouchableOpacity 
              style={[styles.tripBtn, styles.startTripBtn]} 
              onPress={() => handleTrackingToggle(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.tripBtnText}>▶ Start Active Trip</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.tripBtn, styles.endTripBtn]} 
              onPress={() => handleTrackingToggle(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.tripBtnText}>⏹ End Trip & Stop GPS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Trip Stats */}
      {tripStats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Trips</Text>
          <View style={styles.periodStatsRow}>
            <View style={styles.periodStatCol}>
              <Text style={styles.periodStatLabel}>This Week</Text>
              <Text style={styles.periodStatValue}>
                {tripStats.trips_this_week} {tripStats.trips_this_week === 1 ? "trip" : "trips"}
              </Text>
              <Text style={styles.periodStatSub}>{tripStats.distance_this_week_km} km</Text>
            </View>
            <View style={styles.periodStatDivider} />
            <View style={styles.periodStatCol}>
              <Text style={styles.periodStatLabel}>This Month</Text>
              <Text style={[styles.periodStatValue, { color: "#7C3AED" }]}>
                {tripStats.trips_this_month} {tripStats.trips_this_month === 1 ? "trip" : "trips"}
              </Text>
              <Text style={styles.periodStatSub}>{tripStats.distance_this_month_km} km</Text>
            </View>
          </View>
        </View>
      )}

      {/* Today's Boarding */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Boarding</Text>
        <View style={styles.periodStatsRow}>
          <View style={styles.periodStatCol}>
            <Text style={styles.periodStatLabel}>Expected</Text>
            <Text style={styles.periodStatValue}>{dashboard.expected_total}</Text>
          </View>
          <View style={styles.periodStatDivider} />
          <View style={styles.periodStatCol}>
            <Text style={styles.periodStatLabel}>Boarded</Text>
            <Text style={[styles.periodStatValue, { color: "#2e7d32" }]}>{dashboard.boarded_total}</Text>
          </View>
          <View style={styles.periodStatDivider} />
          <View style={styles.periodStatCol}>
            <Text style={styles.periodStatLabel}>Absent</Text>
            <Text style={[styles.periodStatValue, { color: "#64748B" }]}>{dashboard.absent_total}</Text>
          </View>
        </View>
        {Number(dashboard.total_pending_bus_dues) > 0 && (
          <View style={styles.duesBanner}>
            <Ionicons name="alert-circle" size={18} color="#c62828" />
            <Text style={styles.duesBannerText}>
              ₹{dashboard.total_pending_bus_dues} pending in bus dues across your route
            </Text>
          </View>
        )}
      </View>

      {/* Stops Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stops & Boarding Summary</Text>
        <View style={styles.timeline}>
          {dashboard.stops.map((stop: BusStop, index: number) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.dotContainer}>
                <View style={styles.timelineDot} />
                {index < dashboard.stops.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.stopDetails}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopStats}>
                  Boarded: <Text style={{ color: "#2e7d32", fontWeight: "bold" }}>{stop.boarded}</Text> /{" "}
                  Expected: <Text style={{ fontWeight: "bold" }}>{stop.expected}</Text> (Absent: {stop.absent})
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Passenger Roster now lives on its own tab — full list gets long
          fast on routes with 20-30+ subscribers, so it doesn't belong
          embedded in the scrolling dashboard alongside everything else. */}
      <TouchableOpacity
        style={styles.rosterLinkCard}
        onPress={() => router.push(ROUTES.APP.DRIVER_PASSENGERS)}
        activeOpacity={0.8}
      >
        <View style={styles.rosterLinkContent}>
          <Ionicons name="people-outline" size={22} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Passenger Roster</Text>
            <Text style={styles.cardSubtitle}>
              {dashboard.passengers.length} subscriber{dashboard.passengers.length === 1 ? "" : "s"} on this route
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </TouchableOpacity>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    fontSize: 14,
    color: "#c62828",
    textAlign: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  periodStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  periodStatCol: {
    flex: 1,
    alignItems: "center",
  },
  periodStatDivider: {
    width: 1,
    height: 44,
    backgroundColor: "#E2E8F0",
  },
  periodStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  periodStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
  },
  periodStatSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  duesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(198, 40, 40, 0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(198, 40, 40, 0.15)",
    padding: 12,
    marginTop: 16,
  },
  duesBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#c62828",
  },
  timeline: {
    marginTop: 16,
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
  },
  dotContainer: {
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  stopStats: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  rosterLinkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rosterLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  tripActionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  tripBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  startTripBtn: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
  },
  endTripBtn: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
  },
  tripBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
