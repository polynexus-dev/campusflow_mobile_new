import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { busApi, LiveBusData } from "../services/busApi";
import { COLORS } from "@/shared/theme/colors";
import { useAuthStore } from "@store/authStore";
import { BusMap } from "../components/BusMap";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { buildUrl } from "@services/api/buildUrl";
import { Ionicons } from "@expo/vector-icons";

// Helper to calculate distance between two coordinates in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

export const StudentBusScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<LiveBusData[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Real-time bus tracking coordinates via WebSocket
  const [liveLocation, setLiveLocation] = useState<{ [routeId: number]: { lat: number; lng: number } }>({});

  const [permission, requestPermission] = useCameraPermissions();
  const deviceId = useAuthStore((state) => state.deviceId);
  const token = useAuthStore((state) => state.token);
  const collegeSchema = useAuthStore((state) => state.collegeSchema);

  const socketRef = useRef<WebSocket | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch live buses and user subscription details
      const [busesData, subsData] = await Promise.all([
        busApi.getLiveBuses(),
        busApi.getSubscriptions(),
      ]);

      setBuses(busesData);

      // Find active subscription
      const activeSub = subsData.find(
        (s: any) => s.is_valid && s.status === "active"
      );
      setSubscription(activeSub || null);
    } catch (err: any) {
      console.error("Failed to fetch initial bus data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Set up WebSocket connection for tracking active route
  useEffect(() => {
    if (loading || !subscription) return;

    try {
      const httpUrl = buildUrl(`ws/bus-tracking/?token=${token}&schema=${collegeSchema}`);
      const wsUrl = httpUrl.replace(/^http/, "ws");

      console.log("[WS Student] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS Student] WebSocket connected");
        // Track the student's route
        ws.send(
          JSON.stringify({
            action: "track_route",
            route_id: subscription.route,
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "bus_location_update" && data.route) {
            console.log("[WS Student] Live update received:", data.lat, data.lng);
            setLiveLocation((prev) => ({
              ...prev,
              [data.route.id]: { lat: data.lat, lng: data.lng },
            }));
          }
        } catch (err) {
          console.error("[WS Student] Parse error:", err);
        }
      };

      ws.onerror = (e) => {
        console.error("[WS Student] WebSocket error:", e);
      };

      ws.onclose = () => {
        console.log("[WS Student] WebSocket connection closed");
      };

      socketRef.current = ws;
    } catch (err) {
      console.error("[WS Student] Setup error:", err);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [loading, subscription]);

  const handleScanQR = async () => {
    if (!permission) {
      return;
    }
    if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan bus boarding QR codes."
        );
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const res = await busApi.scanBoardingQR(data, deviceId || "mobile-device");
      Alert.alert("Boarding Confirmed", res.message || "Welcome aboard! 🎉");
      setShowScanner(false);
      fetchInitialData();
    } catch (err: any) {
      Alert.alert("Access Denied", err.message || "Failed to confirm boarding.");
    } finally {
      setIsScanning(false);
    }
  };

  // Helper to calculate distance and ETA for a bus
  const calculateStopETA = (bus: LiveBusData) => {
    if (!subscription || subscription.route !== bus.route?.id) return null;
    const boardingStopName = subscription.boarding_stop;
    if (!boardingStopName || !bus.route?.stops) return null;

    const stop = bus.route.stops.find((s) => s.name === boardingStopName);
    if (!stop) return null;

    // Use live location if available, fallback to REST API location
    const currentLoc = liveLocation[bus.route.id] || { lat: bus.lat, lng: bus.lng };
    const distance = getDistance(currentLoc.lat, currentLoc.lng, stop.lat, stop.lng);

    // Assume average speed of 30 km/h (0.5 km per min) -> 2 mins per km
    const etaMin = Math.round(distance * 2.0);

    // Calculate Next Stop dynamically based on closest stop
    let minDistance = Infinity;
    let closestIndex = -1;

    bus.route.stops.forEach((s, index) => {
      const dist = getDistance(currentLoc.lat, currentLoc.lng, s.lat, s.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    let nextStop = "TBD";
    if (closestIndex !== -1) {
      // If bus is close (< 0.2 km) to the stop, the next stop is the next one in sequence
      if (minDistance < 0.2) {
        if (closestIndex < bus.route.stops.length - 1) {
          nextStop = bus.route.stops[closestIndex + 1].name;
        } else {
          nextStop = "College Gate (Final)";
        }
      } else {
        nextStop = bus.route.stops[closestIndex].name;
      }
    }

    return {
      distance: distance.toFixed(2),
      eta: etaMin === 0 ? "Arrived" : `${etaMin} mins`,
      boardingStop: boardingStopName,
      nextStop: nextStop,
    };
  };

  if (showScanner) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>
            Point camera at the QR inside the bus door
          </Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper
      title="Bus Tracking"
      showHeader={true}
      showBack={true}
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollable={true}
    >
      {/* Premium Subscription Header Card */}
      {subscription ? (
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Ionicons name="bus-outline" size={24} color="#FFF" />
            <Text style={styles.subscriptionTitle}>Active Bus Subscription</Text>
          </View>
          <View style={styles.subDetailRow}>
            <Text style={styles.subLabel}>Route:</Text>
            <Text style={styles.subValue}>{subscription.route_name}</Text>
          </View>
          <View style={styles.subDetailRow}>
            <Text style={styles.subLabel}>Boarding Stop:</Text>
            <Text style={styles.subValue}>{subscription.boarding_stop}</Text>
          </View>
          <View style={styles.subDetailRow}>
            <Text style={styles.subLabel}>Status:</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE PASS</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noSubCard}>
          <Ionicons name="warning-outline" size={32} color="#D97706" />
          <Text style={styles.noSubTitle}>No Active Subscription</Text>
          <Text style={styles.noSubText}>
            You are not subscribed to any college bus route. Please pay the bus fees in the Fees section to activate your pass.
          </Text>
        </View>
      )}

      {/* Scan Card */}
      <View style={styles.scanCard}>
        <Text style={styles.scanCardTitle}>Board College Bus</Text>
        <Text style={styles.scanCardText}>
          Scan the printed QR code placed inside your college bus to record
          attendance and verify your active pass.
        </Text>
        <TouchableOpacity style={styles.scanBtn} onPress={handleScanQR}>
          <Text style={styles.scanBtnText}>📷 Open QR Scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Live Buses list */}
      <Text style={styles.sectionTitle}>Live Running Buses</Text>

      {buses.map((bus, idx) => {
        const etaDetails = calculateStopETA(bus);
        const currentLoc = liveLocation[bus.route?.id || 0] || {
          lat: bus.lat,
          lng: bus.lng,
        };

        return (
          <View key={idx} style={styles.busCard}>
            <View style={styles.busHeader}>
              <View>
                <Text style={styles.busRouteName}>
                  {bus.route?.name || "Unassigned Route"}
                </Text>
                <Text style={styles.busDriver}>Driver: {bus.driver_name}</Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.liveIndicatorText}>LIVE</Text>
              </View>
            </View>

            {/* Next Stop Banner */}
            {etaDetails && (
              <View style={styles.nextStopBanner}>
                <Ionicons name="navigate" size={16} color={COLORS.primary} />
                <Text style={styles.nextStopText}>
                  Heading to: <Text style={styles.nextStopHighlight}>{etaDetails.nextStop}</Text>
                </Text>
              </View>
            )}

            {/* Stop ETA details */}
            {etaDetails && (
              <View style={styles.etaContainer}>
                <View style={styles.etaItem}>
                  <Text style={styles.etaLabel}>Your Stop</Text>
                  <Text style={styles.etaValue}>{etaDetails.boardingStop}</Text>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaItem}>
                  <Text style={styles.etaLabel}>Distance</Text>
                  <Text style={styles.etaValue}>{etaDetails.distance} km</Text>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaItem}>
                  <Text style={styles.etaLabel}>ETA</Text>
                  <Text style={[styles.etaValue, { color: COLORS.primary }]}>
                    {etaDetails.eta}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.coords}>
              Last seen GPS: {currentLoc.lat.toFixed(5)},{" "}
              {currentLoc.lng.toFixed(5)} (
              {new Date(bus.last_seen).toLocaleTimeString()})
            </Text>

            {/* Live Bus Map */}
            {bus.route?.stops && (
              <View style={{ marginVertical: 12 }}>
                <BusMap
                  stops={bus.route.stops.map((s) => ({
                    name: s.name,
                    lat: s.lat,
                    lng: s.lng,
                  }))}
                  busLocation={{ lat: currentLoc.lat, lng: currentLoc.lng }}
                />
              </View>
            )}

            {/* Stops List Timeline */}
            {bus.route?.stops && (
              <View style={styles.timeline}>
                {bus.route.stops.map((stop, sIdx) => {
                  const isBoardingStop = subscription?.boarding_stop === stop.name;
                  return (
                    <View key={sIdx} style={styles.timelineItem}>
                      <View
                        style={[
                          styles.timelineDot,
                          isBoardingStop && { backgroundColor: COLORS.primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.timelineStopName,
                          isBoardingStop && {
                            color: COLORS.primary,
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {stop.name} {isBoardingStop && "(Your Stop)"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {buses.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No college buses are currently running on active routes.
          </Text>
        </View>
      )}
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
  subscriptionCard: {
    backgroundColor: "#4a154b",
    borderRadius: 16,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
    paddingBottom: 8,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  subDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  subLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  subValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  activeBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  noSubCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F59E0B",
    alignItems: "center",
    textAlign: "center",
  },
  noSubTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400E",
    marginTop: 8,
  },
  noSubText: {
    fontSize: 13,
    color: "#B45309",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  scanCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  scanCardText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 8,
    lineHeight: 18,
  },
  scanBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 8,
  },
  busCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  busHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  busRouteName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
  },
  busDriver: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#16A34A",
  },
  etaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    justifyContent: "space-between",
  },
  etaItem: {
    flex: 1,
    alignItems: "center",
  },
  etaLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1E293B",
  },
  etaDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
  },
  coords: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
  },
  timeline: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    gap: 8,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#94A3B8",
  },
  timelineStopName: {
    fontSize: 13,
    color: "#334155",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scannerOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 16,
  },
  scannerText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: "#c62828",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  nextStopBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 21, 75, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(74, 21, 75, 0.15)",
  },
  nextStopText: {
    fontSize: 13,
    color: "#1E293B",
  },
  nextStopHighlight: {
    fontWeight: "bold",
    color: COLORS.primary,
  },
});
