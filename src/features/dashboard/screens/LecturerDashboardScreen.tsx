import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { COLORS } from "@/shared/theme/colors";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";

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

  // Dynamic Rotating QR Code states
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [activeQrLecture, setActiveQrLecture] = useState<Lecture | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(0);

  const isHodOrAdmin = user?.role === "Department Head" || user?.role === "Management" || user?.role === "Administrator";

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

  // ── Fetch today's lectures and status ─────────────────────────────────
  const fetchLecturesData = useCallback(async () => {
    try {
      const list = await attendanceApi.getLectures();
      const rawLectures = Array.isArray(list) ? list : list.results || [];

      // Filter for today's lectures
      const todayDate = new Date();
      const todayLectures = rawLectures.filter((l: any) => {
        if (!l.start_time) return false;
        const start = parseDateSafe(l.start_time);
        return (
          start.getDate() === todayDate.getDate() &&
          start.getMonth() === todayDate.getMonth() &&
          start.getFullYear() === todayDate.getFullYear()
        );
      });

      setLectures(todayLectures);

      // Fetch statuses in parallel for all lectures
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

      // Fetch pending biometric device resets for HODs / Admins
      if (isHodOrAdmin) {
        try {
          const resets = await attendanceApi.getLecturerDeviceResetRequests();
          setDeviceResets(resets || []);
        } catch (err) {
          console.error("Failed to load device resets:", err);
        }
      }
    } catch (err) {
      console.error("Failed to load lectures", err);
      Alert.alert("Error", "Could not retrieve your lectures list.");
    } finally {
      setLoadingLectures(false);
      setRefreshing(false);
    }
  }, [isHodOrAdmin]);

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
                seconds_remaining: prev[id].seconds_remaining, // preserve local countdown
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
      // 1. Request location permissions
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        Alert.alert("Location Denied", "Classroom check-in requires GPS location access.");
        return;
      }

      // 2. Fetch current GPS location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;

      // 3. Post check-in to server
      const res = await attendanceApi.lecturerCheckIn(lectureId, lat, lon);
      Alert.alert("📍 Checked In", res.message || "Classroom geofence registered at your location.");

      // Refresh status
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

      // Refresh status
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
    setSelectedIds([]); // Reset selection

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

      // Update local modal list
      setManualRequests((prev) => prev.filter((r) => r.id !== requestId));
      setSelectedIds((prev) => prev.filter((id) => id !== requestId));

      // Refresh lecture status dynamically on dashboard
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
      Alert.alert("Bulk Success", res.message || `Processed {selectedIds.length} requests.`);

      // Filter out completed requests from modal list
      setManualRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);

      // Refresh dynamic status
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

      // Update local modal list
      setDeviceResets((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      Alert.alert("Review Failed", err.message || err.data?.error || "Failed to process reset approval.");
    }
  };

  const fetchNextQrFrame = useCallback(async (lectureId: number) => {
    try {
      const data = await attendanceApi.getLecturerDynamicQR(lectureId);
      setQrImage(data.qr_image);
      setQrExpiresIn(data.expires_in);
    } catch (err: any) {
      console.error("Failed to fetch QR frame:", err);
      setQrModalVisible(false);
      Alert.alert("QR Code Expired", "Attendance session is no longer active.");
    }
  }, []);

  const handleOpenQrCode = (lecture: Lecture) => {
    setActiveQrLecture(lecture);
    setQrImage(null);
    setQrExpiresIn(0);
    setQrModalVisible(true);
    fetchNextQrFrame(lecture.id);
  };

  useEffect(() => {
    if (!qrModalVisible || !activeQrLecture) return;

    const intervalId = setInterval(() => {
      setQrExpiresIn((prev) => {
        if (prev <= 1) {
          fetchNextQrFrame(activeQrLecture.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [qrModalVisible, activeQrLecture, fetchNextQrFrame]);

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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <View style={styles.roleRow}>
              <Text style={styles.userName}>{user?.username || "Lecturer"}</Text>
              <View style={styles.facultyBadge}>
                <Text style={styles.facultyBadgeText}>FACULTY</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => router.push(ROUTES.APP.PROFILE)}
            activeOpacity={0.7}
          >
            <Text style={styles.profileAvatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Report Link Card */}
        <TouchableOpacity
          style={styles.historyCardLink}
          onPress={() => router.push(ROUTES.APP.LECTURER_HISTORY)}
          activeOpacity={0.7}
        >
          <View style={styles.historyCardContent}>
            <Text style={styles.historyCardEmoji}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyCardTitle}>Conducted Lectures Report</Text>
              <Text style={styles.historyCardSubtitle}>View history and filter classes by Date</Text>
            </View>
          </View>
          <Text style={styles.historyCardArrow}>❯</Text>
        </TouchableOpacity>

        {/* HOD Biometric Reset Portal Card Link */}
        {isHodOrAdmin && (
          <TouchableOpacity
            style={[styles.historyCardLink, { backgroundColor: "#8B5CF6", marginTop: -12 }]}
            onPress={handleOpenDeviceResets}
            activeOpacity={0.7}
          >
            <View style={styles.historyCardContent}>
              <Text style={styles.historyCardEmoji}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyCardTitle}>Biometric Reset Tickets</Text>
                <Text style={styles.historyCardSubtitle}>
                  {deviceResets.length > 0
                    ? `${deviceResets.length} pending student reset requests`
                    : "No pending reset requests"}
                </Text>
              </View>
            </View>
            <Text style={styles.historyCardArrow}>❯</Text>
          </TouchableOpacity>
        )}

        {/* Section title */}
        <Text style={styles.sectionTitle}>Today's Lectures</Text>

        {/* Loading lectures */}
        {loadingLectures && (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        )}

        {/* Lectures List */}
        {!loadingLectures && lectures.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
          </View>
        )}

        {!loadingLectures &&
          lectures.map((lec) => {
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
              <View key={lec.id} style={styles.lectureCard}>
                <View style={styles.lectureHeader}>
                  <Text style={styles.lectureSubject}>{lec.subject || "Lecture Code"}</Text>
                  <Text style={styles.lectureTime}>
                    {formatTimeStr(lec.start_time)} - {formatTimeStr(lec.end_time)}
                  </Text>
                </View>
                <Text style={styles.lectureName}>{lec.name}</Text>
                <Text style={styles.classroomText}>📍 Room: {lec.classroom_name || "Classroom"}</Text>

                <View style={styles.divider} />

                {/* Status Badges */}
                <View style={styles.badgesRow}>
                  {statusItem.is_checked_in ? (
                    <View style={[styles.statusBadge, styles.successBadge]}>
                      <Text style={styles.successBadgeText}>✓ Checked In</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.pendingBadge]}>
                      <Text style={styles.pendingBadgeText}>Not Checked In</Text>
                    </View>
                  )}

                  {statusItem.session_active && (
                    <View style={[styles.statusBadge, styles.activeSessionBadge]}>
                      <Text style={styles.activeSessionText}>
                        🔴 Verify Window Open: {formatTimer(statusItem.seconds_remaining)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Dashboard Controls */}
                <View style={styles.controlsRow}>
                  {/* Step 1: Check In */}
                  {!statusItem.is_checked_in && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                      onPress={() => handleCheckIn(lec.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.btnText}>📍 Room Check-In</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Step 2: Start Attendance Session */}
                  {statusItem.is_checked_in && !statusItem.session_active && statusItem.seconds_remaining === 0 && (
                    <TouchableOpacity
                      style={[styles.startPeriodBtn, isLoading && styles.btnDisabled]}
                      onPress={() => handleStartAttendance(lec.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.btnText}>🚀 Start Attendance Window (3m)</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Step 3: Show QR Code when session is active */}
                  {statusItem.is_checked_in && statusItem.session_active && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: "#8B5CF6" }]}
                      onPress={() => handleOpenQrCode(lec)}
                    >
                      <Text style={styles.btnText}>📱 Show QR Code</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Live Stats panel (only when checked in) */}
                {statusItem.is_checked_in && (
                  <View style={styles.statsPanel}>
                    <TouchableOpacity
                      style={styles.statsRow}
                      onPress={() => {
                        setActiveLecture(lec);
                        setStudentsModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.statsLabel}>Verified Students:</Text>
                      <Text style={styles.statsValue}>{statusItem.marked_students_count} present ❯</Text>
                    </TouchableOpacity>

                    {/* Pending Manual Approval Requests */}
                    {statusItem.pending_requests_count > 0 ? (
                      <TouchableOpacity
                        style={[styles.requestsRow, styles.requestsAlertBorder]}
                        onPress={() => handleOpenRequests(lec)}
                      >
                        <Text style={styles.requestsAlertText}>
                          ⚠️ {statusItem.pending_requests_count} manual requests pending
                        </Text>
                        <Text style={styles.requestsAlertLink}>Review ❯</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.requestsRowMuted}>
                        <Text style={styles.requestsMutedText}>No pending manual override requests</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutRow} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL 1: Manual Attendance Requests Review */}
      <Modal visible={requestsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manual Override Requests</Text>
                {manualRequests.length > 0 && (
                  <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn} activeOpacity={0.7}>
                    <Text style={styles.selectAllBtnText}>
                      {selectedIds.length === manualRequests.length ? "Deselect All" : "Select All"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setRequestsModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            {loadingRequests ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 32 }} />
            ) : manualRequests.length === 0 ? (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>All requests resolved. No tickets pending! 🎉</Text>
              </View>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <View style={styles.bulkActionBar}>
                    <Text style={styles.bulkActionTitle}>
                      Bulk Action ({selectedIds.length} selected)
                    </Text>
                    <View style={styles.bulkButtonsRow}>
                      <TouchableOpacity
                        style={[styles.bulkActionBtn, styles.bulkApproveBtn, bulkActionLoading && styles.btnDisabled]}
                        onPress={() => handleBulkReview("approve")}
                        disabled={bulkActionLoading}
                      >
                        {bulkActionLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.actionBtnText}>Approve Selected ✓</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.bulkActionBtn, styles.bulkRejectBtn, bulkActionLoading && styles.btnDisabled]}
                        onPress={() => handleBulkReview("reject")}
                        disabled={bulkActionLoading}
                      >
                        {bulkActionLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.actionBtnText}>Reject Selected ✕</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <FlatList
                  data={manualRequests}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.requestCard}>
                      <View style={styles.requestCardRow}>
                        <TouchableOpacity
                          style={[
                            styles.checkbox,
                            selectedIds.includes(item.id) && styles.checkboxChecked
                          ]}
                          onPress={() => {
                            setSelectedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          {selectedIds.includes(item.id) && (
                            <Text style={styles.checkboxTick}>✓</Text>
                          )}
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <View style={styles.requestCardHeader}>
                            <Text style={styles.requestStudentName}>{item.full_name}</Text>
                            <Text style={styles.requestStudentId}>{item.student_id}</Text>
                          </View>
                          <Text style={styles.requestReason}>Reason: "{item.reason}"</Text>
                        </View>
                      </View>

                      <View style={styles.requestActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleReviewRequest(item.id, "approve")}
                        >
                          <Text style={styles.actionBtnText}>Approve ✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => handleReviewRequest(item.id, "reject")}
                        >
                          <Text style={styles.actionBtnText}>Reject ✕</Text>
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
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verified Attendance List</Text>
              <TouchableOpacity onPress={() => setStudentsModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            {activeLecture && (
              <FlatList
                data={sessionStatuses[activeLecture.id]?.marked_students || []}
                keyExtractor={(item) => item.student_id}
                ListEmptyComponent={
                  <View style={styles.emptyModalState}>
                    <Text style={styles.emptyModalText}>No students checked in yet.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.studentCard}>
                    <View>
                      <Text style={styles.studentName}>{item.full_name}</Text>
                      <Text style={styles.studentId}>{item.student_id}</Text>
                    </View>
                    <Text style={styles.checkinTime}>
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
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Biometric Reset Tickets</Text>
              <TouchableOpacity onPress={() => setDeviceResetsModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            {loadingDeviceResets ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 32 }} />
            ) : deviceResets.length === 0 ? (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>No biometric reset requests pending review.</Text>
              </View>
            ) : (
              <FlatList
                data={deviceResets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.requestCard}>
                    <View style={styles.requestCardHeader}>
                      <Text style={styles.requestStudentName}>{item.full_name}</Text>
                      <Text style={styles.requestStudentId}>{item.student_id}</Text>
                    </View>
                    <Text style={styles.requestReason}>Reason: "{item.reason}"</Text>
                    <Text style={styles.requestedAtText}>
                      Requested: {new Date(item.requested_at).toLocaleDateString()} at {new Date(item.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>

                    <View style={styles.requestActionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleReviewDeviceReset(item.id, "approve")}
                      >
                        <Text style={styles.actionBtnText}>Approve Reset ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleReviewDeviceReset(item.id, "reject")}
                      >
                        <Text style={styles.actionBtnText}>Reject ✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Dynamic Rotating QR Code Generator */}
      <Modal visible={qrModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBgCentered}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Dynamic Check-In QR</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrModalDescription}>
              Have students scan this screen. The code rotates every 15 seconds to prevent proxy attendance.
            </Text>

            <View style={styles.qrContainer}>
              {qrImage ? (
                <Image source={{ uri: qrImage }} style={styles.qrImage} />
              ) : (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 60 }} />
              )}
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>Code rotates in: {qrExpiresIn}s</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(qrExpiresIn / 15) * 100}%` }]} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  facultyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  facultyBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "900",
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  lectureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  lectureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lectureSubject: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lectureTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  lectureName: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  classroomText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  successBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
  },
  pendingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  pendingBadgeText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: "800",
  },
  activeSessionBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  activeSessionText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: "800",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  startPeriodBtn: {
    flex: 1,
    height: 42,
    backgroundColor: "#16A34A", // Premium green accent
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  statsPanel: {
    marginTop: 14,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statsLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  statsValue: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "800",
  },
  requestsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    alignItems: "center",
  },
  requestsAlertBorder: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  requestsAlertText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  requestsAlertLink: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  requestsRowMuted: {
    padding: 12,
    alignItems: "center",
  },
  requestsMutedText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  signOutRow: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    marginTop: 12,
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "50%",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyModalState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyModalText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  requestStudentName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  requestStudentId: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  requestReason: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
    fontStyle: "italic",
  },
  requestActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtn: {
    backgroundColor: "#16A34A",
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  studentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  studentId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  checkinTime: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "700",
  },
  historyCardLink: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  historyCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  historyCardEmoji: {
    fontSize: 24,
  },
  historyCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.white,
  },
  historyCardSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  historyCardArrow: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "800",
  },
  selectAllBtn: {
    marginTop: 4,
  },
  selectAllBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  bulkActionBar: {
    backgroundColor: "rgba(74, 21, 75, 0.05)",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  bulkActionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: "center",
  },
  bulkButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  bulkActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkApproveBtn: {
    backgroundColor: "#16A34A",
  },
  bulkRejectBtn: {
    backgroundColor: COLORS.error,
  },
  requestCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxTick: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  requestedAtText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  modalBgCentered: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  qrModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  qrModalDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  qrContainer: {
    width: 200,
    height: 200,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  qrImage: {
    width: 190,
    height: 190,
  },
  timerContainer: {
    width: "100%",
    alignItems: "center",
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
});
