import React from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { AttendanceHistoryScreen } from "@/features/attendance/screens/AttendanceHistoryScreen";

export const StudentDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

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

  const isFaceRegistered = user?.student_profile?.is_face_registered ?? false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.username || "Student"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* College Tenant details card */}
      <View style={styles.tenantCard}>
        <Text style={styles.tenantLabel}>College ID Domain</Text>
        <Text style={styles.tenantValue}>{useAuthStore.getState().collegeDomain || "Default Public Schema"}</Text>
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
        <View style={[styles.card, styles.successCard]}>
          <Text style={styles.cardTitle}>✓ Biometrics Registered</Text>
          <Text style={styles.cardText}>
            Face profiles are active. You are cleared to take verification checks.
          </Text>
          <Button
            title="Recapture Profiles"
            onPress={() => router.push(ROUTES.APP.REGISTER_FACE)}
            variant="outline"
            style={styles.cardButton}
          />
        </View>
      )}

      {/* Quick Action marking attendance */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Attendance Checking</Text>
        <Button
          title="Mark Lecture Attendance"
          disabled={!isFaceRegistered}
          onPress={() => router.push(ROUTES.APP.MARK_ATTENDANCE)}
          style={styles.actionButton}
        />
      </View>

      {/* Verification History Logs */}
      <View style={styles.historySection}>
        <AttendanceHistoryScreen />
      </View>
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
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 12,
  },
  tenantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  tenantLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tenantValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 4,
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
  actionButton: {
    backgroundColor: COLORS.accent,
  },
  historySection: {
    flex: 1,
    minHeight: 320,
  },
});
export default StudentDashboardScreen;
