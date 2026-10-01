import React from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";

export const SupportStaffDashboardScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const userName = user?.first_name || user?.username || "Staff";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <View style={styles.roleRow}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.staffBadge}>
                <Text style={styles.staffBadgeText}>SUPPORT STAFF</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => router.push(ROUTES.APP.PROFILE)}
            activeOpacity={0.7}
          >
            <Text style={styles.profileAvatarText}>{userName[0]?.toUpperCase() || "S"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Access</Text>

        <TouchableOpacity
          style={styles.cardLink}
          onPress={() => router.push(ROUTES.APP.LEAVE)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>🗓️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Leave Management</Text>
              <Text style={styles.cardSubtitle}>Apply for leave and check your balance</Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardLink}
          onPress={() => router.push(ROUTES.APP.PAYSLIPS)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Payslips</Text>
              <Text style={styles.cardSubtitle}>Monthly salary and deductions</Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardLink}
          onPress={() => router.push(ROUTES.APP.NOTIFICATIONS)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardSubtitle}>Approvals and alerts</Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardLink}
          onPress={() => router.push(ROUTES.APP.ANNOUNCEMENTS)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Announcements</Text>
              <Text style={styles.cardSubtitle}>Latest updates from your institution</Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardLink}
          onPress={() => router.push(ROUTES.APP.BUS_TRACKING)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>🚌</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Bus Tracking</Text>
              <Text style={styles.cardSubtitle}>Track your subscribed bus route live</Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardLink}
          onPress={() => router.push(ROUTES.APP.LIBRARY)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>📚</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Library</Text>
              <Text style={styles.cardSubtitle}>Browse and manage your book issues</Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>❯</Text>
        </TouchableOpacity>
      </ScrollView>
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
  staffBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  staffBadgeText: {
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
    marginBottom: 14,
  },
  cardLink: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.white,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  cardArrow: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default SupportStaffDashboardScreen;
