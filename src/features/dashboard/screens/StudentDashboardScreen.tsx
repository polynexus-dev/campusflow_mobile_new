import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { timetableApi } from "@/features/timetable/api/timetableApi";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const StudentDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const insets = useSafeAreaInsets();
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [resetRequest, setResetRequest] = useState<{ status: string } | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > 100) {
      setShowStickyHeader(true);
    } else {
      setShowStickyHeader(false);
    }
  };

  const parseDateSafe = (dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    let normalized = dateStr;
    if (dateStr.endsWith("+00:00")) {
      normalized = dateStr.slice(0, -6) + "Z";
    }
    return new Date(normalized);
  };

  const formatTimeStr = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr.includes("T")) {
      try {
        const date = parseDateSafe(timeStr);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
      } catch {
        return timeStr;
      }
    }
    try {
      const parts = timeStr.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getLectureStatus = (startTimeStr: string, endTimeStr: string) => {
    const now = new Date();
    const start = parseDateSafe(startTimeStr);
    const end = parseDateSafe(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "completed";
    }

    if (now.getTime() < start.getTime()) {
      return "upcoming";
    } else if (now.getTime() > end.getTime()) {
      return "completed";
    } else {
      return "live";
    }
  };

  const isFaceRegistered = user?.student_profile?.is_face_registered ?? false;

  useEffect(() => {
    const fetchTodayClasses = async () => {
      setLoadingClasses(true);
      try {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayStr = days[new Date().getDay()];
        const todayDate = new Date();

        const [schedulesData, lecturesData] = await Promise.all([
          timetableApi.getSchedules(),
          attendanceApi.getLectures().catch(() => [])
        ]);

        const filteredSchedules = (schedulesData || [])
          .filter((s: any) => s.day_of_week === todayStr)
          .map((s: any) => ({
            ...s,
            type: "schedule",
          }));

        const rawLectures = Array.isArray(lecturesData) ? lecturesData : (lecturesData.results || []);
        const filteredLectures = rawLectures
          .filter((l: any) => {
            if (!l.start_time) return false;
            const start = parseDateSafe(l.start_time);
            return (
              start.getDate() === todayDate.getDate() &&
              start.getMonth() === todayDate.getMonth() &&
              start.getFullYear() === todayDate.getFullYear()
            );
          })
          .map((l: any) => ({
            id: `lecture_${l.id}`,
            course_code: l.code || "LIVE",
            course_name: l.name,
            classroom_name: l.classroom_name,
            start_time: l.start_time,
            end_time: l.end_time,
            type: "lecture",
            code: l.code
          }));

        const getMinutes = (timeStr: string) => {
          if (timeStr.includes("T")) {
            const d = parseDateSafe(timeStr);
            return d.getHours() * 60 + d.getMinutes();
          }
          const parts = timeStr.split(":");
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        };

        const merged = [...filteredLectures, ...filteredSchedules];
        merged.sort((a, b) => getMinutes(a.start_time) - getMinutes(b.start_time));

        setTodayClasses(merged);
      } catch (err) {
        console.error("Failed to load today's classes", err);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchTodayClasses();
  }, []);

  useEffect(() => {
    const checkResetRequest = async () => {
      if (isFaceRegistered) {
        try {
          const res = await attendanceApi.getResetRequestStatus();
          if (res.has_request) {
            setResetRequest({ status: res.status });
          } else {
            setResetRequest(null);
          }
        } catch (err) {
          console.error("Failed to check reset request status:", err);
        }
      }
    };
    checkResetRequest();
  }, [isFaceRegistered]);

  const handleRequestBiometricReset = () => {
    Alert.alert(
      "Confirm Biometric Reset",
      "Are you sure you want to request a biometric / device lock reset? This will notify your HOD or college Admin to review and unlock your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Reset",
          onPress: async () => {
            try {
              await attendanceApi.requestBiometricReset();
              setResetRequest({ status: "pending" });
            } catch (err: any) {
              console.error("Failed to submit biometric reset request:", err);
            }
          }
        }
      ]
    );
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

  const userInitials = (user?.username || "S")[0].toUpperCase();

  // Get nice dynamic date format for the header
  const getHeaderDate = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {showStickyHeader && (
        <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.stickyUserName} numberOfLines={1}>
            {user?.username || "Student"}
          </Text>
          <View style={styles.stickyDateRow}>
            <Feather name="calendar" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.stickyDateText}>{getHeaderDate()}</Text>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.username || "Student"}</Text>
          </View>
          <TouchableOpacity style={styles.profileAvatarBtn} onPress={() => router.push(ROUTES.APP.PROFILE)}>
            <Text style={styles.profileAvatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerBottom}>
          <Feather name="calendar" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>{getHeaderDate()}</Text>
        </View>
      </View>

      {/* Biometrics Status Notification */}
      {!isFaceRegistered ? (
        <View style={styles.biometricWarningBanner}>
          <View style={styles.bannerIconWrapper}>
            <Feather name="shield" size={20} color="#EA580C" />
          </View>
          <View style={styles.bannerTextWrapper}>
            <Text style={styles.bannerTitle}>Biometrics Required</Text>
            <Text style={styles.bannerText}>
              Register your face from 3 angles to enable mobile attendance.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.bannerActionBtn} 
            onPress={() => router.push(ROUTES.APP.REGISTER_FACE)}
          >
            <Text style={styles.bannerActionBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.biometricSuccessBanner}>
          <View style={styles.compactRow}>
            <View style={styles.statusBadgeGreen}>
              <Text style={styles.statusBadgeTextGreen}>✓ Biometrics Active</Text>
            </View>

            {resetRequest ? (
              <View style={[
                styles.requestBadge,
                resetRequest.status === "pending" ? styles.requestStatus_pending
                  : resetRequest.status === "approved" ? styles.requestStatus_approved
                    : styles.requestStatus_rejected
              ]}>
                <Text style={[
                  styles.requestBadgeText,
                  {
                    color: resetRequest.status === "pending" ? COLORS.warning
                      : resetRequest.status === "approved" ? COLORS.success
                        : COLORS.error
                  }
                ]}>
                  Reset: {resetRequest.status.toUpperCase()}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.compactRequestBtn}
                onPress={handleRequestBiometricReset}
                activeOpacity={0.7}
              >
                <Text style={styles.compactRequestBtnText}>Request Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Portal Hub Quick Actions Grid */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Portal Hub</Text>
        <View style={styles.actionGrid}>
          {/* Action 1: Mark Attendance */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!isFaceRegistered}
            onPress={() => router.push(ROUTES.APP.MARK_ATTENDANCE)}
            style={[
              styles.actionGridCard,
              !isFaceRegistered && styles.disabledBtn,
              { borderColor: "rgba(74, 21, 75, 0.2)" }
            ]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(74, 21, 75, 0.08)" }]}>
              <Feather name="camera" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.actionGridButtonText}>Mark Attendance</Text>
          </TouchableOpacity>

          {/* Action 2: Timetable */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.TIMETABLE)}
            style={[styles.actionGridCard, { borderColor: "rgba(97, 31, 105, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(97, 31, 105, 0.08)" }]}>
              <Feather name="calendar" size={22} color={COLORS.accent} />
            </View>
            <Text style={styles.actionGridButtonText}>Timetable</Text>
          </TouchableOpacity>

          {/* Action 3: Assignments */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.ASSIGNMENTS)}
            style={[styles.actionGridCard, { borderColor: "rgba(124, 48, 133, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(124, 48, 133, 0.08)" }]}>
              <Feather name="edit-3" size={22} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionGridButtonText}>Assignments</Text>
          </TouchableOpacity>

          {/* Action 4: My Attendance */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.ATTENDANCE_HISTORY)}
            style={[styles.actionGridCard, { borderColor: "rgba(124, 58, 237, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(124, 58, 237, 0.08)" }]}>
              <Feather name="clipboard" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.actionGridButtonText}>My Attendance</Text>
          </TouchableOpacity>

          {/* Action 5: Bus Tracking */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.BUS_TRACKING)}
            style={[styles.actionGridCard, { borderColor: "rgba(234, 179, 8, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(234, 179, 8, 0.08)" }]}>
              <Feather name="truck" size={22} color="#EA580C" />
            </View>
            <Text style={styles.actionGridButtonText}>Bus Tracking & QR</Text>
          </TouchableOpacity>

          {/* Action 6: My Fees */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.FEES)}
            style={[styles.actionGridCard, { borderColor: "rgba(16, 185, 129, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(16, 185, 129, 0.08)" }]}>
              <Feather name="credit-card" size={22} color="#10B981" />
            </View>
            <Text style={styles.actionGridButtonText}>My Fees & Receipts</Text>
          </TouchableOpacity>

          {/* Action 7: Announcements */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.ANNOUNCEMENTS)}
            style={[styles.actionGridCard, { borderColor: "rgba(59, 130, 246, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(59, 130, 246, 0.08)" }]}>
              <Feather name="bell" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.actionGridButtonText}>Announcements</Text>
          </TouchableOpacity>

          {/* Action 8: Library */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.APP.LIBRARY)}
            style={[styles.actionGridCard, { borderColor: "rgba(217, 119, 6, 0.2)" }]}
          >
            <View style={[styles.actionIconBg, { backgroundColor: "rgba(217, 119, 6, 0.08)" }]}>
              <Feather name="book-open" size={22} color="#D97706" />
            </View>
            <Text style={styles.actionGridButtonText}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Schedule Timeline Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {loadingClasses ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : todayClasses.length === 0 ? (
          <View style={styles.noClassCard}>
            <Feather name="calendar" size={32} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.noClassText}>No lectures scheduled for today.</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {todayClasses.map((c: any, index: number) => {
              const status = c.type === "lecture" ? getLectureStatus(c.start_time, c.end_time) : null;
              const isLive = status === "live";
              const isCompleted = status === "completed";

              let badgeText = c.course_code;
              let stripeStyle: any = styles.stripeUpcoming;
              let badgeColor: string = COLORS.info;

              if (c.type === "lecture") {
                if (isLive) {
                  badgeText = "🔴 LIVE SESSION";
                  stripeStyle = styles.stripeLive;
                  badgeColor = COLORS.error;
                } else if (isCompleted) {
                  badgeText = "⌛ COMPLETED";
                  stripeStyle = styles.stripeCompleted;
                  badgeColor = COLORS.textSecondary;
                } else {
                  badgeText = "⏰ UPCOMING";
                  stripeStyle = styles.stripeUpcoming;
                  badgeColor = COLORS.info;
                }
              } else {
                stripeStyle = styles.stripeUpcoming;
                badgeText = "📅 SCHEDULED";
                badgeColor = COLORS.accent;
              }

              return (
                <View key={c.id} style={styles.timelineItem}>
                  {/* Vertical line indicator connector */}
                  {index < todayClasses.length - 1 && <View style={styles.timelineConnector} />}

                  <View style={[styles.timelineStripe, stripeStyle]} />
                  <View style={styles.timelineDetailsCard}>
                    <View style={styles.timelineCardHeader}>
                      <Text style={[styles.timelineBadge, { color: badgeColor, borderColor: badgeColor }]}>
                        {badgeText}
                      </Text>
                      {c.type === "lecture" && isLive && (
                        <View style={styles.attendanceCodeWrapper}>
                          <Text style={styles.attendanceCodeText}>Code: {c.code}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.timelineClassName, isCompleted && styles.mutedText]} numberOfLines={1}>
                      {c.course_name}
                    </Text>
                    <View style={styles.timelineCardFooter}>
                      <View style={styles.footerInfoItem}>
                        <Feather name="clock" size={12} color={COLORS.textSecondary} />
                        <Text style={[styles.footerInfoText, isCompleted && styles.mutedText]}>
                          {formatTimeStr(c.start_time)} - {formatTimeStr(c.end_time)}
                        </Text>
                      </View>
                      <View style={styles.footerInfoItem}>
                        <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
                        <Text style={[styles.footerInfoText, isCompleted && styles.mutedText]}>
                          Room: {c.classroom_name || "TBD"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Clean light grey slate background
    position: "relative",
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 14,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  stickyUserName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  stickyDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stickyDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  content: {
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 64 : 52,
  },
  header: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  profileAvatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  profileAvatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },
  headerBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dateText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  biometricWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(234, 88, 12, 0.07)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.2)",
    marginBottom: 24,
  },
  bannerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(234, 88, 12, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C2410C",
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: "#9A3412",
    lineHeight: 16,
  },
  bannerActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EA580C",
    borderRadius: 10,
    marginLeft: 10,
  },
  bannerActionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  biometricSuccessBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadgeGreen: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  statusBadgeTextGreen: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  compactRequestBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(74, 21, 75, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(74, 21, 75, 0.2)",
  },
  compactRequestBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  requestBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  requestBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  requestStatus_pending: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  requestStatus_approved: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  requestStatus_rejected: {
    backgroundColor: "rgba(220, 38, 38, 0.05)",
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
  actionSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  actionGridCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionGridButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  scheduleSection: {
    marginBottom: 28,
  },
  noClassCard: {
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  noClassText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  timelineContainer: {
    position: "relative",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 16,
    position: "relative",
  },
  timelineConnector: {
    position: "absolute",
    left: 2,
    top: 36,
    bottom: -24,
    width: 2,
    backgroundColor: "#E2E8F0",
    zIndex: 1,
  },
  timelineStripe: {
    width: 6,
    borderRadius: 3,
    marginRight: 12,
    zIndex: 2,
  },
  stripeLive: {
    backgroundColor: COLORS.error,
  },
  stripeUpcoming: {
    backgroundColor: COLORS.info,
  },
  stripeCompleted: {
    backgroundColor: COLORS.textMuted,
  },
  timelineDetailsCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timelineBadge: {
    fontSize: 10,
    fontWeight: "800",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  attendanceCodeWrapper: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attendanceCodeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.white,
  },
  timelineClassName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  timelineCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 16,
  },
  footerInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  mutedText: {
    color: COLORS.textMuted,
  },
  signOutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.05)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.15)",
    marginTop: 12,
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default StudentDashboardScreen;
