import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
  Platform,
  StatusBar,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuthStore } from "@store/authStore";
import { hasBusConductorAccess } from "@/utils/busAccess";
import { ROUTES } from "@/constants/route";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { ParticularItemRow } from "../components/ParticularItemRow";

type Lecture = {
  id: number;
  name: string;
  subject: string;
  classroom_name?: string;
  start_time: string;
  end_time: string;
  code?: string;
};

type SessionStatus = {
  is_checked_in: boolean;
  session_active: boolean;
  seconds_remaining: number;
  marked_students_count: number;
  marked_students: Array<{
    student_id: string;
    username: string;
    full_name: string;
    timestamp: string;
  }>;
  pending_requests_count: number;
  code?: string;
};

type ManualRequest = {
  id: number;
  student_id: string;
  username: string;
  full_name: string;
  reason: string;
  requested_at: string;
};

export const LecturerDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const insets = useSafeAreaInsets();

  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Map of lectureId -> SessionStatus
  const [sessionStatuses, setSessionStatuses] = useState<Record<number, SessionStatus>>({});
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // Modal states for manual requests review
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [manualRequests, setManualRequests] = useState<ManualRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Detail Modal to view checked in student list
  const [studentsModalVisible, setStudentsModalVisible] = useState(false);

  // Multi-select for manual requests
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // HOD Biometric Reset states
  const [deviceResets, setDeviceResets] = useState<any[]>([]);
  const [loadingDeviceResets, setLoadingDeviceResets] = useState(false);
  const [deviceResetsModalVisible, setDeviceResetsModalVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: showStickyHeader ? 0 : -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: showStickyHeader ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showStickyHeader]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > 60) {
      setShowStickyHeader(true);
    } else {
      setShowStickyHeader(false);
    }
  };

  const isHodOrAdmin =
    user?.role === "Department Head" ||
    user?.role === "Management" ||
    user?.role === "Administrator" ||
    user?.role === "SaaS Admin";

  const parseDateSafe = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    let normalized = dateStr;
    if (dateStr.endsWith("+00:00")) {
      normalized = dateStr.slice(0, -6) + "Z";
    }
    return new Date(normalized);
  };

  const formatTimeStr = (timeStr: string) => {
    try {
      const date = parseDateSafe(timeStr);
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getFormattedDate = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Fetch today's lectures and status ─────────────────────────────────
  const fetchLecturesData = useCallback(async () => {
    try {
      const list = await attendanceApi.getLectures();
      const rawLectures = Array.isArray(list) ? list : list.results || [];

      const todayDate = new Date();
      const todayLectures = rawLectures.filter((l: any) => {
        if (!l.start_time) return false;
        if (l.faculty_username && l.faculty_username !== user?.username) return false;
        const start = parseDateSafe(l.start_time);
        return (
          start.getDate() === todayDate.getDate() &&
          start.getMonth() === todayDate.getMonth() &&
          start.getFullYear() === todayDate.getFullYear()
        );
      });

      setLectures(todayLectures);

      const statusPromises = todayLectures.map(async (lec: Lecture) => {
        try {
          const statusRes = await attendanceApi.getLecturerAttendanceStatus(lec.id);
          return { id: lec.id, status: statusRes };
        } catch {
          return { id: lec.id, status: null };
        }
      });

      const resolvedStatuses = await Promise.all(statusPromises);
      const nextStatuses: Record<number, SessionStatus> = {};
      resolvedStatuses.forEach((item) => {
        if (item.status) {
          nextStatuses[item.id] = item.status;
        }
      });
      setSessionStatuses(nextStatuses);

      if (isHodOrAdmin) {
        try {
          const resets = await attendanceApi.getLecturerDeviceResetRequests();
          setDeviceResets(resets || []);
        } catch (err) {
          console.error("Failed to load device resets:", err);
        }
      }
    } catch (err) {
      console.error("Failed to load lectures:", err);
    } finally {
      setLoadingLectures(false);
      setRefreshing(false);
    }
  }, [isHodOrAdmin, user?.username]);

  useEffect(() => {
    fetchLecturesData();
  }, [fetchLecturesData]);

  // ── Poll countdown timers for active sessions ─────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionStatuses((prev) => {
        const next = { ...prev };
        let updated = false;

        Object.keys(next).forEach((key) => {
          const id = Number(key);
          const statusItem = next[id];
          if (statusItem.session_active && statusItem.seconds_remaining > 0) {
            next[id] = {
              ...statusItem,
              seconds_remaining: statusItem.seconds_remaining - 1,
            };
            if (next[id].seconds_remaining <= 0) {
              next[id].session_active = false;
            }
            updated = true;
          }
        });

        return updated ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ── Auto-sync attendance statistics periodically for active sessions ──
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      let activeIds: number[] = [];
      setSessionStatuses((prev) => {
        activeIds = Object.keys(prev)
          .map(Number)
          .filter((id) => prev[id]?.session_active);
        return prev;
      });

      if (activeIds.length === 0) return;

      for (const id of activeIds) {
        try {
          const nextStatus = await attendanceApi.getLecturerAttendanceStatus(id);
          setSessionStatuses((prev) => {
            if (!prev[id]) return prev;
            return {
              ...prev,
              [id]: {
                ...nextStatus,
                seconds_remaining: prev[id].seconds_remaining,
              },
            };
          });
        } catch (err) {
          console.error(`Failed to auto-sync status for lecture ${id}:`, err);
        }
      }
    }, 4000);

    return () => clearInterval(syncInterval);
  }, [lectures]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLecturesData();
  };

  // ── Step 1: Lecturer Check-in (Sets Dynamic geofence coordinates) ──────
  const handleCheckIn = async (lectureId: number) => {
    setActionLoading((prev) => ({ ...prev, [lectureId]: true }));
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        Alert.alert("Location Denied", "Classroom check-in requires GPS location access.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;

      const res = await attendanceApi.lecturerCheckIn(lectureId, lat, lon);
      Alert.alert("📍 Checked In", res.message || "Classroom geofence registered at your location.");

      const nextStatus = await attendanceApi.getLecturerAttendanceStatus(lectureId);
      setSessionStatuses((prev) => ({ ...prev, [lectureId]: nextStatus }));
    } catch (err: any) {
      console.error("Check-in failed:", err);
      Alert.alert("Check-In Failed", err.message || err.data?.error || "Could not check in.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [lectureId]: false }));
    }
  };

  // ── Step 2: Lecturer Start Attendance Window (3 mins) ──────────────────
  const handleStartAttendance = async (lectureId: number) => {
    setActionLoading((prev) => ({ ...prev, [lectureId]: true }));
    try {
      const res = await attendanceApi.lecturerStartAttendance(lectureId);
      Alert.alert("⏰ Period Started", res.message || "Attendance period is open for 3 minutes.");

      const nextStatus = await attendanceApi.getLecturerAttendanceStatus(lectureId);
      setSessionStatuses((prev) => ({ ...prev, [lectureId]: nextStatus }));
    } catch (err: any) {
      console.error("Start session failed:", err);
      Alert.alert("Activation Failed", err.message || err.data?.error || "Could not start attendance window.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [lectureId]: false }));
    }
  };

  // ── Fetch Manual requests review ──────────────────────────────────────
  const handleOpenRequests = async (lecture: Lecture) => {
    setActiveLecture(lecture);
    setLoadingRequests(true);
    setRequestsModalVisible(true);
    setSelectedIds([]);

    try {
      const data = await attendanceApi.getLecturerManualRequests(lecture.id);
      setManualRequests(data || []);
    } catch (err) {
      console.error("Failed to load manual requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // ── Approve/Reject Manual Request ─────────────────────────────────────
  const handleReviewRequest = async (requestId: number, action: "approve" | "reject") => {
    try {
      const res = await attendanceApi.lecturerApproveManualRequest(requestId, action);
      Alert.alert("Success", res.message || `Request ${action}d.`);

      setManualRequests((prev) => prev.filter((r) => r.id !== requestId));
      setSelectedIds((prev) => prev.filter((id) => id !== requestId));

      if (activeLecture) {
        const nextStatus = await attendanceApi.getLecturerAttendanceStatus(activeLecture.id);
        setSessionStatuses((prev) => ({ ...prev, [activeLecture.id]: nextStatus }));
      }
    } catch (err: any) {
      Alert.alert("Review Failed", err.message || err.data?.error || "Failed to process approval.");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === manualRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(manualRequests.map((r) => r.id));
    }
  };

  const handleBulkReview = async (action: "approve" | "reject") => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await attendanceApi.lecturerBulkApproveManualRequests(selectedIds, action);
      Alert.alert("Bulk Success", res.message || `Processed ${selectedIds.length} requests.`);

      setManualRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);

      if (activeLecture) {
        const nextStatus = await attendanceApi.getLecturerAttendanceStatus(activeLecture.id);
        setSessionStatuses((prev) => ({ ...prev, [activeLecture.id]: nextStatus }));
      }
    } catch (err: any) {
      Alert.alert("Bulk Action Failed", err.message || err.data?.error || "Could not complete bulk operation.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleOpenDeviceResets = async () => {
    setLoadingDeviceResets(true);
    setDeviceResetsModalVisible(true);
    try {
      const data = await attendanceApi.getLecturerDeviceResetRequests();
      setDeviceResets(data || []);
    } catch (err) {
      console.error("Failed to load device resets:", err);
    } finally {
      setLoadingDeviceResets(false);
    }
  };

  const handleReviewDeviceReset = async (requestId: number, action: "approve" | "reject") => {
    try {
      const res = await attendanceApi.lecturerApproveDeviceResetRequest(requestId, action);
      Alert.alert("Success", res.message || `Reset request ${action}d.`);

      setDeviceResets((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      Alert.alert("Review Failed", err.message || err.data?.error || "Failed to process reset approval.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace(ROUTES.AUTH.LOGIN);
        },
      },
    ]);
  };

  const userInitials = (user?.username || "L")[0].toUpperCase();

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs.toString().padStart(2, "0")}s`;
  };

  // Quick Access particulars items array
  const particularsItems = [
    {
      id: "report",
      title: "Conducted Lectures Report",
      subtitle: "View history and filter classes by Date",
      iconName: "bar-chart-2" as const,
      onPress: () => router.push(ROUTES.APP.LECTURER_HISTORY),
      highlightSubtitle: false,
    },
    {
      id: "leave",
      title: "Leave Management",
      subtitle: "Apply for leave and check your balance",
      iconName: "calendar" as const,
      onPress: () => router.push(ROUTES.APP.LEAVE),
      highlightSubtitle: false,
    },
    {
      id: "payslips",
      title: "Payslips",
      subtitle: "Monthly salary and deductions",
      iconName: "dollar-sign" as const,
      onPress: () => router.push(ROUTES.APP.PAYSLIPS),
      highlightSubtitle: false,
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "Correction reviews, approvals and alerts",
      iconName: "bell" as const,
      onPress: () => router.push(ROUTES.APP.NOTIFICATIONS),
      highlightSubtitle: false,
    },
    ...(isHodOrAdmin
      ? [
          {
            id: "deviceResets",
            title: "Biometric Reset Tickets",
            subtitle:
              deviceResets.length > 0
                ? `${deviceResets.length} pending student reset requests`
                : "No pending reset requests",
            iconName: "shield" as const,
            onPress: handleOpenDeviceResets,
            highlightSubtitle: deviceResets.length > 0,
          },
        ]
      : []),
    ...(hasBusConductorAccess(user)
      ? [
          {
            id: "busConductor",
            title: "Bus Route Conductor Panel",
            subtitle: "Start live GPS stream and track stop passenger tallies",
            iconName: "truck" as const,
            onPress: () => router.push(ROUTES.APP.BUS_TRACKING),
            highlightSubtitle: true,
          },
        ]
      : []),
  ];

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Sticky Animated Header */}
      <Animated.View
        pointerEvents={showStickyHeader ? "auto" : "none"}
        style={{
          paddingTop: insets.top + 12,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }}
        className="absolute top-0 left-0 right-0 bg-white/95 border-b border-slate-100 flex-row justify-between items-center px-6 pb-3.5 z-50 shadow-sm"
      >
        <Text className="text-[16px] font-extrabold text-slate-800" numberOfLines={1}>
          {user?.username || "Lecturer"}
        </Text>
        <View className="flex-row items-center">
          <Feather name="calendar" size={14} color="#5D1E62" className="mr-1.5" />
          <Text className="text-xs font-bold text-[#5D1E62] uppercase tracking-wider">{getFormattedDate()}</Text>
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: Platform.OS === "ios" ? insets.top + 16 : insets.top + 20,
          paddingBottom: 40,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5D1E62" />
        }
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1 mr-4">
            <Text className="text-slate-400 text-[13px] font-semibold">Welcome back,</Text>
            <Text className="text-slate-800 text-[22px] font-black mt-0.5" numberOfLines={1}>
              {user?.username || "Lecturer"}
            </Text>
            <View className="self-start bg-[#5D1E62] px-2.5 py-0.5 rounded-md mt-1.5">
              <Text className="text-white text-[9px] font-black tracking-widest uppercase">FACULTY</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push(ROUTES.APP.PROFILE)}
            activeOpacity={0.7}
            className="w-12 h-12 bg-white border-2 border-slate-100 rounded-full justify-center items-center shadow-sm"
          >
            <Text className="text-[#5D1E62] font-black text-base">{userInitials}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access Section - Unified Particulars Container */}
        <View className="mb-6">
          <Text className="text-[18px] font-black text-slate-800 tracking-tight mb-3">Quick Access</Text>
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {particularsItems.map((item, index) => (
              <ParticularItemRow
                key={item.id}
                iconName={item.iconName}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.onPress}
                isLast={index === particularsItems.length - 1}
                highlightSubtitle={item.highlightSubtitle}
              />
            ))}
          </View>
        </View>

        {/* Today's Lectures Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 p-2">
            <Text className="text-[18px] font-black text-slate-800 tracking-tight">Today's Lectures</Text>
            <View className="bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md">
              <Text className="text-[#5D1E62] text-[11px] font-bold">
                {lectures.length} scheduled
              </Text>
            </View>
          </View>

          {loadingLectures ? (
            <ActivityIndicator size="large" color="#5D1E62" className="my-8" />
          ) : lectures.length === 0 ? (
            <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center justify-center">
              <View className="w-12 h-12 bg-purple-50 rounded-lg justify-center items-center mb-3">
                <Feather name="calendar" size={22} color="#5D1E62" />
              </View>
              <Text className="text-slate-800 font-bold text-sm">No lectures scheduled for today</Text>
              <Text className="text-slate-400 text-xs mt-1">Enjoy your free time!</Text>
            </View>
          ) : (
            <View className="gap-4">
              {lectures.map((lec) => {
                const statusItem = sessionStatuses[lec.id] || {
                  is_checked_in: false,
                  session_active: false,
                  seconds_remaining: 0,
                  marked_students_count: 0,
                  marked_students: [],
                  pending_requests_count: 0,
                };

                const isLoading = actionLoading[lec.id] || false;

                return (
                  <View key={lec.id} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                    {/* Lecture Header */}
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="bg-purple-50 border border-purple-100 px-3 py-1 rounded-md">
                        <Text className="text-[#5D1E62] font-black text-xs">{lec.subject || "Subject"}</Text>
                      </View>
                      <View className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                        <Feather name="clock" size={12} color="#64748b" className="mr-1" />
                        <Text className="text-slate-600 text-xs font-bold">
                          {formatTimeStr(lec.start_time)} - {formatTimeStr(lec.end_time)}
                        </Text>
                      </View>
                    </View>

                    {/* Lecture Title & Room */}
                    <Text className="text-slate-800 font-extrabold text-[16px] mb-1">{lec.name}</Text>
                    <View className="flex-row items-center mb-3">
                      <Feather name="map-pin" size={13} color="#94a3b8" className="mr-1" />
                      <Text className="text-slate-400 text-xs font-semibold">
                        Room: {lec.classroom_name || "Classroom"}
                      </Text>
                    </View>

                    <View className="h-[1px] bg-slate-100 my-3" />

                    {/* Status Badges */}
                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {statusItem.is_checked_in ? (
                        <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md flex-row items-center">
                          <Feather name="check-circle" size={12} color="#059669" className="mr-1.5" />
                          <Text className="text-emerald-700 text-xs font-bold">Checked In</Text>
                        </View>
                      ) : (
                        <View className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-md flex-row items-center">
                          <Feather name="alert-circle" size={12} color="#d97706" className="mr-1.5" />
                          <Text className="text-amber-700 text-xs font-bold">Not Checked In</Text>
                        </View>
                      )}

                      {statusItem.session_active && (
                        <View className="bg-rose-50 border border-rose-200 px-3 py-1 rounded-md flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                          <Text className="text-rose-700 text-xs font-extrabold">
                            Window Open: {formatTimer(statusItem.seconds_remaining)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Dashboard Controls */}
                    <View className="mb-3">
                      {!statusItem.is_checked_in && (
                        <TouchableOpacity
                          onPress={() => handleCheckIn(lec.id)}
                          disabled={isLoading}
                          activeOpacity={0.8}
                          className="bg-[#5D1E62] py-3 px-4 rounded-xl flex-row items-center justify-center shadow-sm"
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Feather name="map-pin" size={15} color="#FFF" className="mr-2" />
                              <Text className="text-white font-extrabold text-xs">Room Check-In</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {statusItem.is_checked_in && !statusItem.session_active && statusItem.seconds_remaining === 0 && (
                        <TouchableOpacity
                          onPress={() => handleStartAttendance(lec.id)}
                          disabled={isLoading}
                          activeOpacity={0.8}
                          className="bg-emerald-600 py-3 px-4 rounded-xl flex-row items-center justify-center shadow-sm"
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Feather name="play-circle" size={15} color="#FFF" className="mr-2" />
                              <Text className="text-white font-extrabold text-xs">Start Attendance Window (3m)</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {statusItem.is_checked_in && statusItem.session_active && (
                        <View className="bg-blue-600 py-3 px-4 rounded-xl flex-row items-center justify-center shadow-sm">
                          <Feather name="key" size={15} color="#FFF" className="mr-2" />
                          <Text className="text-white font-black text-xs tracking-wider">
                            Code: {statusItem.code || "..."}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Live Stats panel (only when checked in) */}
                    {statusItem.is_checked_in && (
                      <View className="bg-slate-50 border border-slate-100 rounded-xl p-3 gap-2">
                        <TouchableOpacity
                          onPress={() => {
                            setActiveLecture(lec);
                            setStudentsModalVisible(true);
                          }}
                          activeOpacity={0.7}
                          className="flex-row items-center justify-between py-1"
                        >
                          <Text className="text-slate-600 font-bold text-xs">Verified Students</Text>
                          <View className="flex-row items-center">
                            <Text className="text-[#5D1E62] font-black text-xs mr-1">
                              {statusItem.marked_students_count} present
                            </Text>
                            <Feather name="chevron-right" size={14} color="#5D1E62" />
                          </View>
                        </TouchableOpacity>

                        {statusItem.pending_requests_count > 0 ? (
                          <TouchableOpacity
                            onPress={() => handleOpenRequests(lec)}
                            activeOpacity={0.8}
                            className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex-row items-center justify-between mt-1"
                          >
                            <View className="flex-row items-center flex-1 mr-2">
                              <Feather name="alert-triangle" size={14} color="#d97706" className="mr-2" />
                              <Text className="text-amber-800 font-bold text-xs" numberOfLines={1}>
                                {statusItem.pending_requests_count} manual requests pending
                              </Text>
                            </View>
                            <Text className="text-amber-900 font-extrabold text-xs">Review ❯</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text className="text-slate-400 font-semibold text-[11px] text-center mt-1">
                            No pending manual override requests
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      {/* MODAL 1: Manual Attendance Requests Review */}
      <Modal visible={requestsModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] min-h-[50%] px-6 pt-5 pb-8">
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <View>
                <Text className="text-[17px] font-extrabold text-slate-800">Manual Override Requests</Text>
                {manualRequests.length > 0 && (
                  <TouchableOpacity onPress={toggleSelectAll} activeOpacity={0.7} className="mt-1">
                    <Text className="text-[#5D1E62] text-xs font-bold">
                      {selectedIds.length === manualRequests.length ? "Deselect All" : "Select All"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setRequestsModalVisible(false)}
                className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <Text className="text-slate-600 text-xs font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            {loadingRequests ? (
              <ActivityIndicator size="large" color="#5D1E62" className="my-8" />
            ) : manualRequests.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Text className="text-slate-500 font-bold text-sm text-center">
                  All requests resolved. No tickets pending! 🎉
                </Text>
              </View>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <View className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                    <Text className="text-[#5D1E62] text-xs font-extrabold text-center mb-2">
                      Bulk Action ({selectedIds.length} selected)
                    </Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => handleBulkReview("approve")}
                        disabled={bulkActionLoading}
                        className="flex-1 bg-emerald-600 py-2 rounded-lg items-center justify-center"
                      >
                        {bulkActionLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text className="text-white text-xs font-extrabold">Approve Selected ✓</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleBulkReview("reject")}
                        disabled={bulkActionLoading}
                        className="flex-1 bg-rose-600 py-2 rounded-lg items-center justify-center"
                      >
                        {bulkActionLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text className="text-white text-xs font-extrabold">Reject Selected ✕</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <FlatList
                  data={manualRequests}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-100 shadow-sm">
                      <View className="flex-row items-center mb-2">
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          activeOpacity={0.7}
                          className={`w-5 h-5 rounded border-2 justify-center items-center mr-3 ${
                            selectedIds.includes(item.id)
                              ? "bg-[#5D1E62] border-[#5D1E62]"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedIds.includes(item.id) && (
                            <Feather name="check" size={12} color="#FFF" />
                          )}
                        </TouchableOpacity>

                        <View className="flex-1">
                          <View className="flex-row justify-between items-center">
                            <Text className="text-slate-800 font-extrabold text-sm">{item.full_name}</Text>
                            <Text className="text-[#5D1E62] font-bold text-xs">{item.student_id}</Text>
                          </View>
                          <Text className="text-slate-500 text-xs italic mt-1">Reason: "{item.reason}"</Text>
                        </View>
                      </View>

                      <View className="flex-row gap-3 mt-2">
                        <TouchableOpacity
                          onPress={() => handleReviewRequest(item.id, "approve")}
                          className="flex-1 bg-emerald-600 py-2 rounded-lg items-center justify-center"
                        >
                          <Text className="text-white text-xs font-extrabold">Approve ✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleReviewRequest(item.id, "reject")}
                          className="flex-1 bg-rose-600 py-2 rounded-lg items-center justify-center"
                        >
                          <Text className="text-white text-xs font-extrabold">Reject ✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: List Checked In Students */}
      <Modal visible={studentsModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] min-h-[50%] px-6 pt-5 pb-8">
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <Text className="text-[17px] font-extrabold text-slate-800">Verified Attendance List</Text>
              <TouchableOpacity
                onPress={() => setStudentsModalVisible(false)}
                className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <Text className="text-slate-600 text-xs font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            {activeLecture && (
              <FlatList
                data={sessionStatuses[activeLecture.id]?.marked_students || []}
                keyExtractor={(item) => item.student_id}
                ListEmptyComponent={
                  <View className="py-12 items-center justify-center">
                    <Text className="text-slate-400 font-semibold text-sm">No students checked in yet.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View className="flex-row justify-between items-center bg-slate-50 p-3.5 rounded-xl mb-2 border border-slate-100">
                    <View>
                      <Text className="text-slate-800 font-bold text-sm">{item.full_name}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">{item.student_id}</Text>
                    </View>
                    <Text className="text-emerald-600 text-xs font-bold">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Biometric Device Reset Requests (HOD Console) */}
      <Modal visible={deviceResetsModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] min-h-[50%] px-6 pt-5 pb-8">
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <Text className="text-[17px] font-extrabold text-slate-800">Biometric Reset Tickets</Text>
              <TouchableOpacity
                onPress={() => setDeviceResetsModalVisible(false)}
                className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <Text className="text-slate-600 text-xs font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            {loadingDeviceResets ? (
              <ActivityIndicator size="large" color="#5D1E62" className="my-8" />
            ) : deviceResets.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Text className="text-slate-400 font-semibold text-sm text-center">
                  No biometric reset requests pending review.
                </Text>
              </View>
            ) : (
              <FlatList
                data={deviceResets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View className="bg-white rounded-xl p-4 mb-3 border border-slate-100 shadow-sm">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-slate-800 font-extrabold text-sm">{item.full_name}</Text>
                      <Text className="text-[#5D1E62] font-bold text-xs">{item.student_id}</Text>
                    </View>
                    <Text className="text-slate-500 text-xs italic mb-1">Reason: "{item.reason}"</Text>
                    <Text className="text-slate-400 text-[11px] mb-3">
                      Requested: {new Date(item.requested_at).toLocaleDateString()} at{" "}
                      {new Date(item.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>

                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => handleReviewDeviceReset(item.id, "approve")}
                        className="flex-1 bg-emerald-600 py-2 rounded-lg items-center justify-center"
                      >
                        <Text className="text-white text-xs font-extrabold">Approve Reset ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleReviewDeviceReset(item.id, "reject")}
                        className="flex-1 bg-rose-600 py-2 rounded-lg items-center justify-center"
                      >
                        <Text className="text-white text-xs font-extrabold">Reject ✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LecturerDashboardScreen;
