import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { timetableApi } from "@/features/timetable/api/timetableApi";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";

export const StudentDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

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

  useEffect(() => {
    const fetchTodayClasses = async () => {
      setLoadingClasses(true);
      try {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayStr = days[new Date().getDay()];
        const todayDate = new Date();

        // 1. Fetch schedules & lectures in parallel
        const [schedulesData, lecturesData] = await Promise.all([
          timetableApi.getSchedules(),
          attendanceApi.getLectures().catch(() => [])
        ]);

        // 2. Filter today's schedules
        const filteredSchedules = (schedulesData || [])
          .filter((s: any) => s.day_of_week === todayStr)
          .map((s: any) => ({
            ...s,
            type: "schedule",
          }));

        // 3. Filter today's lectures (matching local date)
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

        // 4. Sort and merge
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

  const [resetRequest, setResetRequest] = useState<{ status: string } | null>(null);

  const isFaceRegistered = user?.student_profile?.is_face_registered ?? false;

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
              const res = await attendanceApi.requestBiometricReset();
              Alert.alert("Success", res.message || "Reset request submitted successfully.");
              setResetRequest({ status: "pending" });
            } catch (err: any) {
              Alert.alert("Request Failed", err.message || err.data?.error || "Failed to submit request.");
            }
          }
        }
      ]
    );
  };

  const userInitials = (user?.username || "S")[0].toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.username || "Student"}</Text>
        </View>
        <TouchableOpacity style={styles.profileAvatarBtn} onPress={() => router.push(ROUTES.APP.PROFILE)}>
          <Text style={styles.profileAvatarText}>{userInitials}</Text>
        </TouchableOpacity>
      </View>

      {/* Biometrics Status Card */}
      {!isFaceRegistered ? (
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.cardTitle}>Biometrics Required</Text>
          <Text style={styles.cardText}>
            You must register your face from 3 separate angles before marking attendance.
          </Text>
          <Button
            title="Register Face Data"
            onPress={() => router.push(ROUTES.APP.REGISTER_FACE)}
            style={styles.cardButton}
          />
        </View>
      ) : (
        <View style={styles.compactSuccessBanner}>
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

      {/* Quick Actions Grid */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Portal Hub</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!isFaceRegistered}
            onPress={() => router.push(ROUTES.APP.MARK_ATTENDANCE)}
            style={[styles.actionGridButton, !isFaceRegistered && styles.disabledBtn, { backgroundColor: COLORS.primary }]}
          >
            <Text style={styles.actionGridButtonIcon}>📸</Text>
            <Text style={styles.actionGridButtonText}>Mark Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(ROUTES.APP.TIMETABLE)}
            style={[styles.actionGridButton, { backgroundColor: COLORS.accent }]}
          >
            <Text style={styles.actionGridButtonIcon}>📅</Text>
            <Text style={styles.actionGridButtonText}>Timetable</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(ROUTES.APP.ASSIGNMENTS)}
            style={[styles.actionGridButton, { backgroundColor: COLORS.secondary }]}
          >
            <Text style={styles.actionGridButtonIcon}>📝</Text>
            <Text style={styles.actionGridButtonText}>Assignments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(ROUTES.APP.ATTENDANCE_HISTORY)}
            style={[styles.actionGridButton, { backgroundColor: '#7C3AED' }]}
          >
            <Text style={styles.actionGridButtonIcon}>📋</Text>
            <Text style={styles.actionGridButtonText}>My Attendance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Schedule Card */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {loadingClasses ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : todayClasses.length === 0 ? (
          <View style={styles.noClassCard}>
            <Text style={styles.noClassText}>No lectures scheduled for today.</Text>
          </View>
        ) : (
          todayClasses.map((c: any) => {
            const status = c.type === "lecture" ? getLectureStatus(c.start_time, c.end_time) : null;
            const isLive = status === "live";
            const isCompleted = status === "completed";

            let badgeText = c.course_code;
            let badgeStyle: any = styles.miniClassCode;
            let cardStyle: any = styles.miniClassCard;

            if (c.type === "lecture") {
              if (isLive) {
                badgeText = "🔴 LIVE SESSION";
                badgeStyle = [styles.miniClassCode, styles.liveClassCode];
                cardStyle = [styles.miniClassCard, styles.liveClassCard];
              } else if (isCompleted) {
                badgeText = "⌛ COMPLETED";
                badgeStyle = [styles.miniClassCode, styles.completedClassCode];
                cardStyle = [styles.miniClassCard, styles.completedClassCard];
              } else {
                badgeText = "⏰ UPCOMING";
                badgeStyle = [styles.miniClassCode, styles.upcomingClassCode];
                cardStyle = [styles.miniClassCard, styles.upcomingClassCard];
              }
            }

            return (
              <View key={c.id} style={cardStyle}>
                <View style={styles.miniClassHeader}>
                  <View style={styles.codeContainer}>
                    <Text style={badgeStyle}>{badgeText}</Text>
                    {c.type === "lecture" && isLive && (
                      <Text style={styles.attendanceCodeBadge}>Code: {c.code}</Text>
                    )}
                  </View>
                </View>

                <Text style={[styles.miniClassName, isCompleted && styles.mutedText]} numberOfLines={1}>
                  {c.course_name}
                </Text>

                <View style={styles.miniClassDetails}>
                  <Text style={[styles.miniClassTime, isCompleted && styles.mutedText]}>
                    🕐 {formatTimeStr(c.start_time)} - {formatTimeStr(c.end_time)}
                  </Text>
                  <Text style={[styles.miniClassRoom, isCompleted && styles.mutedText]}>
                    📍 Room: {c.classroom_name || "TBD"}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>



      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutRow} onPress={handleLogout}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 52,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  profileAvatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileAvatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.2,
    marginBottom: 24,
  },
  warningCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: COLORS.warning,
  },
  successCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: COLORS.success,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardButton: {
    height: 44,
  },
  actionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  actionGridButton: {
    width: '47%',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionGridButtonIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionGridButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  disabledBtn: {
    opacity: 0.4,
  },
  scheduleSection: {
    marginBottom: 24,
  },
  noClassCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  noClassText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  miniClassCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  miniClassHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  miniClassCode: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.12)", // Translucent purple matching primary
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveClassCard: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
    backgroundColor: "rgba(220, 38, 38, 0.03)",
  },
  liveClassCode: {
    color: COLORS.error,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  attendanceCodeBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.white,
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedClassCard: {
    opacity: 0.6,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    borderColor: COLORS.border,
  },
  completedClassCode: {
    color: "#64748b",
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  upcomingClassCard: {
    borderColor: COLORS.info,
    borderWidth: 1,
    backgroundColor: "rgba(59, 130, 246, 0.03)",
  },
  upcomingClassCode: {
    color: COLORS.info,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  mutedText: {
    color: "#94a3b8",
  },
  miniClassTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  miniClassDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  miniClassName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  miniClassRoom: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  historySection: {
    flex: 1,
    minHeight: 320,
  },
  signOutRow: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    marginTop: 20,
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
  compactSuccessBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadgeGreen: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBadgeTextGreen: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "800",
  },
  compactRequestBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(74, 21, 75, 0.08)",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  compactRequestBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  requestBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  requestStatus_pending: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  requestStatus_approved: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  requestStatus_rejected: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
});

export default StudentDashboardScreen;
