import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import httpClient from "@services/api/httpClient";

interface ProfileData {
  user?: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role?: string;
  tenant?: string;
  student_id?: string;
  department?: string;
  contact_number?: string;
  gender?: string;
  date_of_birth?: string;
  batch_academic_year?: string;
  current_semester_year?: string;
  section_division?: string;
  admission_number?: string;
  program_enrolled_in?: string;
  [key: string]: any;
}

export const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await httpClient.get("/user/");
        setProfile(response.data);
      } catch (err: any) {
        console.error("Failed to load profile", err);
        // Fall back to local store data
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
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

  const displayName =
    profile?.user
      ? `${profile.user.first_name || ""} ${profile.user.last_name || ""}`.trim() || profile.user.username
      : user?.username || "Student";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const role = (profile?.role || user?.role || "student").toLowerCase();
  const isStudent = role === "student";

  const hasAcademicInfo = !!(
    profile?.student_id ||
    user?.student_profile?.student_id ||
    profile?.department ||
    profile?.program_enrolled_in ||
    profile?.batch_academic_year ||
    profile?.current_semester_year ||
    profile?.section_division ||
    profile?.admission_number
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Dashboard</Text>
      </TouchableOpacity>

      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>
          {profile?.user?.email || user?.email || ""}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {(profile?.role || user?.role || "student").toUpperCase()}
          </Text>
        </View>
        {profile?.tenant && (
          <Text style={styles.tenantName}>{profile.tenant}</Text>
        )}
      </View>

      {/* Info Sections */}
      {hasAcademicInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Student ID" value={profile?.student_id || user?.student_profile?.student_id} />
            <InfoRow label="Department" value={profile?.department} />
            <InfoRow label="Program" value={profile?.program_enrolled_in} />
            <InfoRow label="Batch / Year" value={profile?.batch_academic_year} />
            <InfoRow label="Semester" value={profile?.current_semester_year} />
            <InfoRow label="Section" value={profile?.section_division} />
            <InfoRow label="Admission No." value={profile?.admission_number} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Username" value={profile?.user?.username || user?.username} />
          <InfoRow label="Gender" value={profile?.gender} />
          <InfoRow label="Date of Birth" value={profile?.date_of_birth} />
          <InfoRow label="Contact" value={profile?.contact_number} />
          <InfoRow label="Nationality" value={profile?.nationality} />
          <InfoRow label="Blood Group" value={profile?.blood_group} />
        </View>
      </View>

      {/* Biometrics Status */}
      {isStudent && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.infoCard}>
            <InfoRow
              label="Face Registered"
              value={
                (user?.student_profile?.is_face_registered ?? false)
                  ? "✅ Yes"
                  : "❌ Not Yet"
              }
            />
            <InfoRow
              label="Device Locked"
              value={user?.student_profile?.locked_device_id ? "🔒 Bound" : "🔓 Not bound"}
            />
          </View>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// Reusable info row component
const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 24,
    paddingTop: 52,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  profileCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
    elevation: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.white,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  tenantName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 10,
    fontWeight: "500",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    flex: 1.2,
    textAlign: "right",
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    elevation: 4,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ProfileScreen;
