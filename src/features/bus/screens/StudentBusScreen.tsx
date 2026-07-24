import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Modal, TextInput, LayoutAnimation, UIManager, Animated, PanResponder } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Feather, Ionicons } from "@expo/vector-icons";
import { cssInterop } from "nativewind";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { busApi, LiveBusData } from "../services/busApi";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { useAuthStore } from "@store/authStore";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { buildUrl } from "@services/api/buildUrl";

// Register custom ScreenWrapper component for NativeWind support if needed
cssInterop(ScreenWrapper, { className: "style" });

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<LiveBusData[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showNoBusModal, setShowNoBusModal] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Animated values for bottom sheet gesture dragging
  const translateY = useRef(new Animated.Value(180)).current;
  const lastGestureDy = useRef(180);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        let newTranslateY = lastGestureDy.current + gestureState.dy;
        if (newTranslateY < 0) newTranslateY = 0;
        if (newTranslateY > 180) newTranslateY = 180;
        translateY.setValue(newTranslateY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const isSwipeUp = gestureState.dy < -35 || (gestureState.dy < 0 && gestureState.vy < -0.5);
        const isSwipeDown = gestureState.dy > 35 || (gestureState.dy > 0 && gestureState.vy > 0.5);
        
        let targetValue = 180;
        if (isSwipeUp) {
          targetValue = 0;
        } else if (isSwipeDown) {
          targetValue = 180;
        } else {
          targetValue = lastGestureDy.current < 90 ? 0 : 180;
        }

        Animated.spring(translateY, {
          toValue: targetValue,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }).start(() => {
          lastGestureDy.current = targetValue;
          setIsSheetExpanded(targetValue === 0);
        });
      },
    })
  ).current;

  const handleToggleExpand = () => {
    const targetValue = lastGestureDy.current === 180 ? 0 : 180;
    Animated.spring(translateY, {
      toValue: targetValue,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start(() => {
      lastGestureDy.current = targetValue;
      setIsSheetExpanded(targetValue === 0);
    });
  };


  // Real-time bus tracking coordinates via WebSocketr
  const [liveLocation, setLiveLocation] = useState<{ [routeId: number]: { lat: number; lng: number } }>({});

  const [permission, requestPermission] = useCameraPermissions();
  const deviceId = useAuthStore((state) => state.deviceId);
  const token = useAuthStore((state) => state.token);
  const collegeSchema = useAuthStore((state) => state.collegeSchema);

  const socketRef = useRef<WebSocket | null>(null);
  const webRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [busesData, subsData] = await Promise.all([
        busApi.getLiveBuses(),
        busApi.getSubscriptions(),
      ]);

      setBuses(busesData);

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

  // Set default selectedRouteId based on subscription or running buses
  useEffect(() => {
    if (subscription && selectedRouteId === null) {
      setSelectedRouteId(subscription.route);
    } else if (buses.length > 0 && selectedRouteId === null) {
      setSelectedRouteId(buses[0].route?.id || null);
    }
  }, [subscription, buses]);

  // Trigger warning modal when active route has no running bus
  useEffect(() => {
    if (selectedRouteId !== null && buses.length > 0) {
      const hasBus = buses.some((b) => b.route?.id === selectedRouteId);
      if (!hasBus) {
        setShowNoBusModal(true);
      } else {
        setShowNoBusModal(false);
      }
    }
  }, [selectedRouteId, buses]);

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

  // Find active bus for the selected route
  const activeBus = buses.find((b) => b.route?.id === selectedRouteId);
  const currentLoc = activeBus ? (liveLocation[selectedRouteId || 0] || { lat: activeBus.lat, lng: activeBus.lng }) : null;
  const stops = activeBus?.route?.stops || [];

  // Helper to calculate distance and ETA for a bus
  const calculateStopETA = (bus: LiveBusData) => {
    const targetStopName = subscription?.boarding_stop || (bus.route?.stops && bus.route.stops.length > 0 ? bus.route.stops[bus.route.stops.length - 1].name : null);
    if (!targetStopName || !bus.route?.stops) return null;

    const stop = bus.route.stops.find((s) => s.name === targetStopName);
    if (!stop) return null;

    const loc = liveLocation[bus.route.id] || { lat: bus.lat, lng: bus.lng };
    const distance = getDistance(loc.lat, loc.lng, stop.lat, stop.lng);

    // Assume average speed of 30 km/h (2 mins per km)
    const etaMin = Math.round(distance * 2.0);

    let minDistance = Infinity;
    let closestIndex = -1;

    bus.route.stops.forEach((s, index) => {
      const dist = getDistance(loc.lat, loc.lng, s.lat, s.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    let nextStop = "TBD";
    if (closestIndex !== -1) {
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
      distance: distance.toFixed(1),
      eta: etaMin === 0 ? "Arrived" : `${etaMin} mins`,
      boardingStop: targetStopName,
      nextStop: nextStop,
    };
  };

  const etaDetails = activeBus ? calculateStopETA(activeBus) : null;
  const nextStopIndex = stops.findIndex((s) => s.name === etaDetails?.nextStop);

  const getEstimatedStopTime = (stopIndex: number, nextIndex: number, etaMinutes: number) => {
    const date = new Date();
    const diff = (stopIndex - nextIndex) * 4 + etaMinutes;
    date.setMinutes(date.getMinutes() + diff);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Inject Leaflet actions when map is ready and selected stops or bus updates change
  useEffect(() => {
    if (isMapReady && webRef.current && stops.length > 0) {
      const stopsJson = JSON.stringify(stops);
      const boardingStopName = subscription?.boarding_stop || "";
      const nextStopName = etaDetails?.nextStop || "";
      
      const script = `
        (function() {
          if (window.loadRoute) {
            window.loadRoute(${stopsJson}, "${boardingStopName}", "${nextStopName}");
          }
        })();
        true;
      `;
      webRef.current.injectJavaScript(script);
    }
  }, [isMapReady, selectedRouteId, stops, subscription?.boarding_stop, etaDetails?.nextStop]);

  useEffect(() => {
    if (isMapReady && webRef.current && currentLoc) {
      const script = `
        (function() {
          if (window.updateBusLocation) {
            window.updateBusLocation(${currentLoc.lat}, ${currentLoc.lng});
          }
        })();
        true;
      `;
      webRef.current.injectJavaScript(script);
    }
  }, [isMapReady, currentLoc?.lat, currentLoc?.lng]);

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"><\/script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #f8f9fa;
    }
    @keyframes pulse {
      0% {
        transform: scale(0.9);
        opacity: 1;
      }
      70% {
        transform: scale(1.5);
        opacity: 0;
      }
      100% {
        transform: scale(0.9);
        opacity: 0;
      }
    }
    .bus-glow-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      position: relative;
    }
    .bus-glow-marker::before {
      content: '';
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(74, 21, 75, 0.25);
      animation: pulse 2s infinite;
      z-index: 0;
    }
    .bus-glow-core {
      position: relative;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #4a154b;
      border: 2px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      z-index: 1;
    }
    .bus-icon-svg {
      width: 14px;
      height: 14px;
      fill: #ffffff;
    }
    .normal-stop-marker {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff;
      border: 2.5px solid #7c3085;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .passed-stop-marker {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff;
      border: 2.5px solid #cbd5e1;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .boarding-stop-marker {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      border: 4px solid #4a154b;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .boarding-stop-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #4a154b;
    }
    .boarding-stop-label {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #111827;
      color: #ffffff;
      font-size: 11px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      pointer-events: none;
    }
    .boarding-stop-label::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -4px;
      border-width: 4px;
      border-style: solid;
      border-color: #111827 transparent transparent transparent;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([21.1458, 79.0882], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    }).addTo(map);

    var stopsData = [];
    var stopMarkers = [];
    var routePoints = [];
    var routeLine = null;
    var busMarker = null;

    window.loadRoute = function(stops, boardingStopName, nextStopName) {
      stopMarkers.forEach(function(m) { map.removeLayer(m); });
      stopMarkers = [];
      routePoints = [];
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }

      stopsData = stops;
      var nextStopIndex = stops.findIndex(function(s) { return s.name === nextStopName; });

      stops.forEach(function(stop, index) {
        var lat = parseFloat(stop.lat);
        var lng = parseFloat(stop.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          routePoints.push([lat, lng]);
          
          var isBoarding = stop.name === boardingStopName;
          var isPassed = nextStopIndex !== -1 && index < nextStopIndex;

          var iconHtml = '';
          var iconClass = '';
          var iconSize = [16, 16];
          var iconAnchor = [8, 8];

          if (isBoarding) {
            iconHtml = '<div class="boarding-stop-marker"><div class="boarding-stop-dot"><\/div><div class="boarding-stop-label">' + stop.name + '<\/div><\/div>';
            iconSize = [24, 24];
            iconAnchor = [12, 12];
          } else if (isPassed) {
            iconHtml = '<div class="passed-stop-marker"><\/div>';
            iconSize = [12, 12];
            iconAnchor = [6, 6];
          } else {
            iconHtml = '<div class="normal-stop-marker"><\/div>';
            iconSize = [12, 12];
            iconAnchor = [6, 6];
          }

          var icon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: iconSize,
            iconAnchor: iconAnchor
          });

          var marker = L.marker([lat, lng], { icon: icon }).addTo(map);
          stopMarkers.push(marker);
        }
      });

      if (routePoints.length > 1) {
        routeLine = L.polyline(routePoints, { color: '#7c3085', weight: 4 }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
      }
    };

    window.updateBusLocation = function(lat, lng) {
      if (!lat || !lng) return;
      var pos = [parseFloat(lat), parseFloat(lng)];
      
      if (!busMarker) {
        var busIcon = L.divIcon({
          html: '<div class="bus-glow-marker"><div class="bus-glow-core"><svg class="bus-icon-svg" viewBox="0 0 24 24"><path d="M18 11H6V6h12v5zm-1.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-9 0C6.67 18.5 6 17.83 6 17s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM20 4H4c-1.1 0-2 .9-2 2v10c0 1.66 1.34 3 3 3l-1.5 1.5v.5h17v-.5L19 19c1.66 0 3-1.34 3-3V6c0-1.1-.9-2-2-2z"\/><\/svg><\/div><\/div>',
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
        busMarker = L.marker(pos, { icon: busIcon }).addTo(map);
      } else {
        busMarker.setLatLng(pos);
      }
      map.setView(pos, 15, { animate: true, duration: 1.0 });
    };
  </script>
</body>
</html>
  `;

  if (showScanner) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
        />
        <View className="absolute bottom-10 left-5 right-5 items-center gap-4">
          <Text className="text-white text-sm text-center bg-black/60 px-4 py-2 rounded-lg">
            Point camera at the QR inside the bus door
          </Text>
          <TouchableOpacity
            className="bg-[#c62828] px-6 py-3 rounded-xl"
            onPress={() => setShowScanner(false)}
          >
            <Text className="text-white font-bold text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9F9FB]">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const selectedRouteName = buses.find(b => b.route?.id === selectedRouteId)?.route?.name || subscription?.route_name || "Select Route";

  return (
    <ScreenWrapper
      showHeader={false}
      disablePadding={true}
      style={{ flex: 1 }}
    >
      <StatusBar style="dark" />

      {/* Map Layout Area */}
      <View className="flex-1 relative">
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoad={() => setIsMapReady(true)}
          className="flex-1"
        />

        {/* Blurred Status Bar Background Overlay */}
        <BlurView
          intensity={100}
          tint="light"
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top || 24, 
          }} 
          className="z-50 overflow-hidden"
        />

        {/* Float Controls Overlay */}
        {/* Back Button */}
        <TouchableOpacity
          style={{
            top: (insets.top || 24) + 12,
            left: 16,
            width: 44,
            height: 44,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }}
          className="absolute bg-white rounded-full justify-center items-center shadow-md elevation-4 z-40"
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color="#1f2937" />
        </TouchableOpacity>

        {/* Route Selector dropdown capsule */}
        <TouchableOpacity
          style={{
            top: (insets.top || 24) + 12,
            left: 72,
            right: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          }}
          className="absolute flex-row items-center justify-between bg-white rounded-full border border-gray-100 shadow-md elevation-4 px-4 h-11 z-40"
          onPress={() => setIsDropdownOpen(true)}
        >
          <View className="flex-row items-center flex-1 pr-2">
            <Ionicons name="bus-outline" size={18} color="#4a154b" className="mr-2" />
            <Text numberOfLines={1} className="font-bold text-textMain text-sm">
              {selectedRouteName}
            </Text>
          </View>
          <Feather name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>

        {/* Floating Scanner Action button */}
        <Animated.View
          className="absolute z-40"
          style={{
            bottom: activeBus ? 396 + insets.bottom : 16 + insets.bottom,
            right: 16,
            transform: activeBus ? [{ translateY: translateY }] : [],
            shadowColor: "#4a154b",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <TouchableOpacity
            className="bg-primary rounded-full justify-center items-center flex-row px-4 h-12"
            onPress={handleScanQR}
          >
            <Feather name="camera" size={18} color="#FFFFFF" className="mr-2" />
            <Text className="text-white font-bold text-sm">Board Bus</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Floating Route Stops Action button (Only visible when offline) */}
        {!activeBus && (
          <TouchableOpacity
            className="absolute bg-white border border-gray-100 rounded-full justify-center items-center shadow-lg z-40 flex-row px-4 h-12"
            style={{
              bottom: 16 + insets.bottom,
              left: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 6,
            }}
            onPress={() => setShowNoBusModal(true)}
          >
            <Ionicons name="information-circle-outline" size={18} color="#4a154b" className="mr-2" />
            <Text className="text-primary font-bold text-sm">Route Stops</Text>
          </TouchableOpacity>
        )}

        {/* Bottom Sheet Information overlay panel */}
        {activeBus ? (
          <Animated.View
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              height: 380 + insets.bottom,
              transform: [{ translateY: translateY }],
            }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-6 shadow-2xl elevation-10 z-30 overflow-hidden"
            {...panResponder.panHandlers}
          >
            {/* Expandable touch header and drag indicator handle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleExpand}
              className="w-full pb-3"
            >
              <View className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
            </TouchableOpacity>

            <View>
              {/* Dynamic ETA details Row */}
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                  <Text className="text-3xl font-extrabold text-textMain tracking-tight">
                    {etaDetails?.eta ? etaDetails.eta.replace(" mins", "") : "TBD"}{" "}
                    <Text className="text-lg font-bold text-textMain">min</Text>
                  </Text>
                  <Text className="text-sm text-textSecondary mt-1">
                    to {etaDetails?.boardingStop || "your stop"} · {etaDetails?.distance || "0.0"} km away
                  </Text>
                </View>
                <View className="flex-row items-center bg-[#DCFCE7] px-3 py-1.5 rounded-full">
                  <View className="w-2 h-2 rounded-full bg-[#16A34A] mr-2" />
                  <Text className="text-xs font-bold text-[#16A34A]">En route</Text>
                </View>
              </View>

              {/* Connected Timeline list */}
              <View className={`mb-4 relative pl-6 ${isSheetExpanded ? "max-h-[300px]" : "max-h-[120px]"}`}>
                <View className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-[#F1F5F9]" />
                
                <ScrollView showsVerticalScrollIndicator={false}>
                  {stops.map((stop, sIdx) => {
                    const isBoardingStop = subscription?.boarding_stop === stop.name;
                    const isPassed = nextStopIndex !== -1 && sIdx < nextStopIndex;
                    const isCurrent = nextStopIndex !== -1 && sIdx === nextStopIndex;
                    const stopTime = getEstimatedStopTime(
                      sIdx,
                      nextStopIndex !== -1 ? nextStopIndex : 0,
                      etaDetails?.eta ? parseInt(etaDetails.eta) : 0
                    );

                    return (
                      <View key={sIdx} className="flex-row items-center py-2 relative">
                        {/* Circle bullet connected line dot */}
                        <View
                          className={`absolute left-[-23px] w-3.5 h-3.5 rounded-full border-2 bg-white z-10 justify-center items-center ${
                            isPassed ? "border-gray-200" : isCurrent ? "border-primary bg-primary" : "border-primary"
                          }`}
                        >
                          {isCurrent && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </View>

                        <View className="flex-1 flex-row items-center pr-2">
                          <Text
                            className={`text-[15px] ${
                              isPassed ? "text-textSecondary font-normal" : "text-textMain font-bold"
                            }`}
                          >
                            {stop.name}
                          </Text>
                          {isBoardingStop && (
                            <View className="bg-primary/10 px-2 py-0.5 rounded-md ml-2">
                              <Text className="text-[10px] font-bold text-primary">Your stop</Text>
                            </View>
                          )}
                        </View>

                        <Text
                          className={`text-sm ${
                            isPassed ? "text-textSecondary font-normal" : "text-textMain font-semibold"
                          }`}
                        >
                          {stopTime}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Bottom Sheet action button */}
              <TouchableOpacity
                className={`h-12 rounded-2xl justify-center items-center ${
                  notifyEnabled ? "bg-primary" : "bg-primary/10"
                }`}
                onPress={() => {
                  setNotifyEnabled(!notifyEnabled);
                  Alert.alert(
                    !notifyEnabled ? "Notification Set" : "Notification Cancelled",
                    !notifyEnabled
                      ? "We will notify you 2 minutes before the bus reaches your stop!"
                      : "Stop notifications have been turned off."
                  );
                }}
              >
                <Text className={`font-bold text-sm ${notifyEnabled ? "text-white" : "text-primary"}`}>
                  {notifyEnabled ? "✓ Stop notifications active" : "Notify me before my stop"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {/* Custom Dropdown Modal */}
      {isDropdownOpen && (
        <Modal visible={isDropdownOpen} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 bg-black/40 justify-center items-center px-6"
            activeOpacity={1}
            onPress={() => setIsDropdownOpen(false)}
          >
            <View className="bg-white rounded-3xl w-full max-h-[60%] p-6 shadow-xl">
              <Text className="text-lg font-bold text-textMain mb-4">Select Route</Text>
              <ScrollView>
                {buses.map((bus, index) => {
                  const isSelected = bus.route?.id === selectedRouteId;
                  const isSubbed = subscription?.route === bus.route?.id;
                  return (
                    <TouchableOpacity
                      key={index}
                      className={`flex-row justify-between items-center py-4 border-b border-[#F1F5F9] ${
                        isSelected ? "bg-purple-50 px-3 rounded-xl" : ""
                      }`}
                      onPress={() => {
                        setSelectedRouteId(bus.route?.id || null);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <View>
                        <Text className={`text-base font-semibold ${isSelected ? "text-primary" : "text-textMain"}`}>
                          {bus.route?.name || "Route"}
                        </Text>
                        <Text className="text-xs text-textSecondary mt-0.5">Driver: {bus.driver_name}</Text>
                      </View>
                      {isSubbed && (
                        <View className="bg-primary/10 px-2.5 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-primary">Subscribed</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {buses.length === 0 && (
                  <Text className="text-sm text-textSecondary text-center py-4">No active routes running</Text>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* No Live Bus Warning Bottom-Sheet-Style Modal */}
      {showNoBusModal && (
        <Modal 
          visible={showNoBusModal} 
          transparent={true} 
          animationType="slide"
          onRequestClose={() => setShowNoBusModal(false)}
        >
          <TouchableOpacity 
            className="flex-1 bg-black/40 justify-end"
            activeOpacity={1}
            onPress={() => setShowNoBusModal(false)}
          >
            {/* The Sheet Card at the bottom */}
            <TouchableOpacity 
              activeOpacity={1} 
              className="bg-white rounded-t-[28px] p-6 shadow-2xl elevation-10"
              style={{ paddingBottom: insets.bottom + 20, maxHeight: "75%" }}
            >
              {/* Drag Handle Indicator */}
              <View className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

              {/* Header inside the bottom sheet modal */}
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-4">
                  <Text className="text-2xl font-extrabold text-textMain tracking-tight">
                    Route Offline
                  </Text>
                  <Text className="text-sm text-textSecondary mt-1">
                    Showing scheduled stops timeline
                  </Text>
                </View>
                <View className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full">
                  <View className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                  <Text className="text-xs font-bold text-gray-500">Offline</Text>
                </View>
              </View>

              <Text className="text-sm text-textSecondary leading-5 mb-5">
                There is no live GPS tracking data for this route at the moment. Please select another route or check back later.
              </Text>

              {/* Scrollable stops timeline fallback */}
              {stops.length > 0 ? (
                <View className="max-h-[220px] mb-6 relative pl-6">
                  <View className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-[#F1F5F9]" />
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {stops.map((stop, sIdx) => {
                      const isBoardingStop = subscription?.boarding_stop === stop.name;
                      return (
                        <View key={sIdx} className="flex-row items-center py-2 relative">
                          <View className="absolute left-[-23px] w-3.5 h-3.5 rounded-full border-2 border-gray-300 bg-white z-10" />
                          <View className="flex-1 flex-row items-center pr-2">
                            <Text className="text-[15px] text-textSecondary font-semibold">{stop.name}</Text>
                            {isBoardingStop && (
                              <View className="bg-primary/10 px-2 py-0.5 rounded-md ml-2">
                                <Text className="text-[10px] font-bold text-primary">Your stop</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <Text className="text-sm text-textSecondary mb-6">No stops defined for this route.</Text>
              )}

              {/* Dismiss Button */}
              <TouchableOpacity
                className="bg-primary w-full h-12 rounded-2xl justify-center items-center"
                onPress={() => setShowNoBusModal(false)}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-sm">Okay, I understand</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </ScreenWrapper>
  );
};

export default StudentBusScreen;
