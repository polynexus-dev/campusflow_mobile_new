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
import { busApi, DriverDashboardData, BusStop, BusPassenger, TripStats } from "../services/busApi";
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(ROUTES.APP.LEAVE)} hitSlop={10}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(ROUTES.APP.PROFILE_STANDALONE)} hitSlop={10}>
            <Ionicons name="person-circle-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      }
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollable={true}
    >
      {/* Route Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Active Route</Text>
        <Text style={styles.routeName}>{dashboard.routeName || dashboard.route_name}</Text>
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
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
              <Text style={styles.metricVal}>{tripStats.trips_this_week}</Text>
              <Text style={styles.metricLabel}>Trips This Week</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
              <Text style={styles.metricVal}>{tripStats.distance_this_week_km} km</Text>
              <Text style={styles.metricLabel}>Distance This Week</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: "#7C3AED" }]}>
              <Text style={[styles.metricVal, { color: "#7C3AED" }]}>{tripStats.trips_this_month}</Text>
              <Text style={styles.metricLabel}>Trips This Month</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: "#7C3AED" }]}>
              <Text style={[styles.metricVal, { color: "#7C3AED" }]}>{tripStats.distance_this_month_km} km</Text>
              <Text style={styles.metricLabel}>Distance This Month</Text>
            </View>
          </View>
        </View>
      )}

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.metricVal}>{dashboard.expected_total}</Text>
          <Text style={styles.metricLabel}>Expected Students</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: "#2e7d32" }]}>
          <Text style={[styles.metricVal, { color: "#2e7d32" }]}>{dashboard.boarded_total}</Text>
          <Text style={styles.metricLabel}>Boarded (Scanned)</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: "#94A3B8" }]}>
          <Text style={[styles.metricVal, { color: "#64748B" }]}>{dashboard.absent_total}</Text>
          <Text style={styles.metricLabel}>Absent</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: "#c62828" }]}>
          <Text style={[styles.metricVal, { color: "#c62828" }]}>₹{dashboard.total_pending_bus_dues}</Text>
          <Text style={styles.metricLabel}>Pending Bus Dues</Text>
        </View>
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

      {/* Passenger Roster — students carry a bus fee balance, faculty/staff
          charges are payroll-deducted so there's nothing to chase there */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Passenger Roster</Text>
        <View style={styles.roster}>
          {dashboard.passengers.map((p: BusPassenger) => (
            <View key={p.user_id} style={styles.rosterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rosterName}>{p.name}</Text>
                <Text style={styles.rosterMeta}>
                  {p.role} · {p.boarding_stop}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={p.boarded_today ? styles.rosterBoarded : styles.rosterNotBoarded}>
                  {p.boarded_today ? "Boarded" : "Not boarded"}
                </Text>
                {p.fee_status === "pending" ? (
                  <Text style={styles.feePending}>Pending ₹{p.balance_fee}</Text>
                ) : p.fee_status === "paid" ? (
                  <Text style={styles.feePaid}>Fees Paid</Text>
                ) : (
                  <Text style={styles.feePayroll}>Payroll Deduction</Text>
                )}
              </View>
            </View>
          ))}
          {dashboard.passengers.length === 0 && (
            <Text style={styles.rosterEmpty}>No subscribers on this route yet.</Text>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
  row: {
    flexDirection: "row",
    justifyContent: "between",
    alignItems: "center",
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
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
  roster: {
    gap: 12,
  },
  rosterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rosterName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  rosterMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  rosterBoarded: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2e7d32",
  },
  rosterNotBoarded: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  feePending: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c62828",
  },
  feePaid: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2e7d32",
  },
  feePayroll: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  rosterEmpty: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 12,
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
