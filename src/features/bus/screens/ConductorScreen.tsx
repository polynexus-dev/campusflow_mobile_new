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
import { busApi, DriverDashboardData, BusStop } from "../services/busApi";
import { COLORS } from "@/shared/theme/colors";
import * as Location from "expo-location";
import { useAuthStore } from "@store/authStore";
import { buildUrl } from "@services/api/buildUrl";

export const ConductorScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DriverDashboardData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  useEffect(() => {
    fetchDashboard();
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
      const httpUrl = buildUrl("ws/bus-tracking/");
      const wsUrl = httpUrl.replace(/^http/, "ws");

      console.log("[WS Conductor] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS Conductor] WebSocket connected");
        setIsTracking(true);
        // Start streaming location
        locationIntervalRef.current = setInterval(streamLocation, 10000);
        streamLocation(); // initial push
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
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const streamLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

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
    } catch (err) {
      console.warn("Failed to get device coordinates:", err);
    }
  };

  const handleTrackingToggle = (value: boolean) => {
    if (value) {
      startTracking();
    } else {
      stopTracking();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Route Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Active Route</Text>
        <Text style={styles.routeName}>{dashboard.routeName || dashboard.route_name}</Text>
      </View>

      {/* GPS Switch */}
      <View style={[styles.card, styles.row]}>
        <View>
          <Text style={styles.cardTitle}>Conductor GPS Tracker</Text>
          <Text style={styles.cardSubtitle}>
            {isTracking
              ? `Live coordinates: ${currentCoords?.lat.toFixed(5)}, ${currentCoords?.lng.toFixed(5)}`
              : "Inactive - Bus is stationary"}
          </Text>
        </View>
        <Switch
          value={isTracking}
          onValueChange={handleTrackingToggle}
          trackColor={{ false: "#ccc", true: COLORS.primary }}
        />
      </View>

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
        <View style={[styles.metricCard, { borderLeftColor: "#c62828" }]}>
          <Text style={[styles.metricVal, { color: "#c62828" }]}>{dashboard.absent_total}</Text>
          <Text style={styles.metricLabel}>Remaining Dues</Text>
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
    </ScrollView>
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
    gap: 12,
  },
  metricCard: {
    flex: 1,
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
});
