import React, { useState, useEffect } from "react";
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

export const StudentBusScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<LiveBusData[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const deviceId = useAuthStore((state) => state.deviceId);

  const fetchLiveBuses = async () => {
    try {
      setLoading(true);
      const data = await busApi.getLiveBuses();
      setBuses(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveBuses();
  }, []);

  const handleScanQR = async () => {
    if (!permission) {
      // Camera permissions are still loading
      return;
    }
    if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted.granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan bus boarding QR codes.");
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
      fetchLiveBuses();
    } catch (err: any) {
      Alert.alert("Access Denied", err.message || "Failed to confirm boarding.");
    } finally {
      setIsScanning(false);
    }
  };

  if (showScanner) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Point camera at the QR inside the bus door</Text>
          <TouchableOpacity style={styles.cancelBtn} onClick={() => setShowScanner(false)}>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Scan Card */}
      <View style={styles.scanCard}>
        <Text style={styles.scanCardTitle}>Board College Bus</Text>
        <Text style={styles.scanCardText}>
          Scan the printed QR code placed inside your college bus to record attendance and verify your active pass.
        </Text>
        <TouchableOpacity style={styles.scanBtn} onClick={handleScanQR}>
          <Text style={styles.scanBtnText}>📷 Open QR Scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Live Buses list */}
      <Text style={styles.sectionTitle}>Live Running Buses</Text>
      
      {buses.map((bus, idx) => (
        <View key={idx} style={styles.busCard}>
          <View style={styles.busHeader}>
            <View>
              <Text style={styles.busRouteName}>{bus.route?.name || "Unassigned Route"}</Text>
              <Text style={styles.busDriver}>Driver: {bus.driver_name}</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveIndicatorDot} />
              <Text style={styles.liveIndicatorText}>LIVE</Text>
            </View>
          </View>

          <Text style={styles.coords}>
            Last seen GPS: {bus.lat.toFixed(5)}, {bus.lng.toFixed(5)} ({new Date(bus.last_seen).toLocaleTimeString()})
          </Text>

          {/* Stops List Timeline */}
          {bus.route?.stops && (
            <View style={styles.timeline}>
              {bus.route.stops.map((stop, sIdx) => (
                <View key={sIdx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineStopName}>{stop.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {buses.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No college buses are currently running on active routes.</Text>
        </View>
      )}
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
});
