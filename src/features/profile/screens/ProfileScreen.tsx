import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import httpClient from "@services/api/httpClient";
import { logError } from "@/errors/errorHandler";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  nationality?: string;
  blood_group?: string;
  [key: string]: any;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress?: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  value,
  onPress,
  danger = false,
}) => {
  // If it's a read-only display detail and value is empty, do not show the menu item
  if (!danger && !onPress && !value) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.menuItem,
        danger ? styles.menuItemDanger : styles.menuItemNormal,
      ]}
    >
      {/* Icon Container */}
      <View
        style={[
          styles.menuIconWrapper,
          danger ? styles.menuIconWrapperDanger : styles.menuIconWrapperNormal,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={danger ? COLORS.error : COLORS.primary}
        />
      </View>

      {/* Content */}
      <View style={styles.menuContent}>
        <Text
          numberOfLines={1}
          style={[styles.menuLabel, danger ? styles.menuLabelDanger : styles.menuLabelNormal]}
        >
          {label}
        </Text>
        {!!value && (
          <Text numberOfLines={1} style={styles.menuValue}>
            {value}
          </Text>
        )}
      </View>

      {/* Chevron indicator for clickable items */}
      {!!onPress && !danger && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={COLORS.textMuted}
        />
      )}
    </TouchableOpacity>
  );
};

interface SectionTitleProps {
  title: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return (
    <Text style={styles.sectionTitle}>
      {title}
    </Text>
  );
};

interface ProfileStatProps {
  label: string;
  value: string;
}

const ProfileStat: React.FC<ProfileStatProps> = ({ label, value }) => {
  return (
    <View style={styles.statCol}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.statValue}>
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
};

export const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newContactNumber, setNewContactNumber] = useState("");
  const [updatingContact, setUpdatingContact] = useState(false);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle("light-content");
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("transparent");
        StatusBar.setTranslucent(true);
      }
      return () => {
        StatusBar.setBarStyle("dark-content");
      };
    }, [])
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await httpClient.get("/user/");
        setProfile(response.data);
      } catch (err: any) {
        logError(err, "ProfileScreen:fetchProfile");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleEditContact = () => {
    setNewContactNumber(profile?.contact_number || "");
    setEditModalVisible(true);
  };

  const handleSaveContact = async () => {
    setUpdatingContact(true);
    try {
      await httpClient.put("/user/", {
        contact_number: newContactNumber,
      });
      setProfile((prev) => prev ? { ...prev, contact_number: newContactNumber } : null);
      setEditModalVisible(false);
      Alert.alert("Success", "Contact number updated successfully.");
    } catch (err: any) {
      logError(err, "ProfileScreen:handleSaveContact");
      Alert.alert("Error", err.response?.data?.detail || err.message || "Failed to update contact number.");
    } finally {
      setUpdatingContact(false);
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

  // Set up stats values dynamically
  const stat1Label = isStudent ? "Semester" : "Position";
  const stat1Value = isStudent ? (profile?.current_semester_year || "—") : (profile?.role || user?.role || "—");

  const stat2Label = isStudent ? "Section" : "College";
  const stat2Value = isStudent ? (profile?.section_division || "—") : (profile?.tenant || "—");

  const stat3Label = isStudent ? "Student ID" : "User ID";
  const stat3Value = isStudent 
    ? (profile?.student_id || user?.student_profile?.student_id || "—") 
    : (profile?.user?.username || user?.username || "—");

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Header Section */}
        <View style={[styles.heroSection, { paddingTop: insets.top + 16 }]}>
          {/* Header Actions Row */}
          <View style={styles.headerActionsRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* User Profile Summary */}
          <View style={styles.userSummaryRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfoCol}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.userRole}>
                {(profile?.role || user?.role || "student").toUpperCase()}
              </Text>
              {profile?.tenant && (
                <View style={styles.tenantBadge}>
                  {user?.tenant_logo ? (
                    <Image source={{ uri: user.tenant_logo }} style={styles.tenantLogo} />
                  ) : (
                    <Ionicons name="business-outline" size={13} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.tenantBadgeText} numberOfLines={1}>
                    {profile.tenant}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <ProfileStat label={stat1Label} value={stat1Value} />
            <View style={styles.statDivider} />
            <ProfileStat label={stat2Label} value={stat2Value} />
            <View style={styles.statDivider} />
            <ProfileStat label={stat3Label} value={stat3Value} />
          </View>
        </View>

        {/* Floating Content Overlays */}
        <View style={styles.floatingContent}>
          {/* Academic Information Section */}
          {hasAcademicInfo && (
            <View>
              <SectionTitle title="Academic Information" />
              <MenuItem
                icon="book-outline"
                label="Program Enrolled"
                value={profile?.program_enrolled_in}
              />
              <MenuItem
                icon="business-outline"
                label="Department"
                value={profile?.department}
              />
              <MenuItem
                icon="calendar-outline"
                label="Academic Year"
                value={profile?.batch_academic_year}
              />
              <MenuItem
                icon="grid-outline"
                label="Section / Division"
                value={profile?.section_division}
              />
              <MenuItem
                icon="id-card-outline"
                label="Admission Number"
                value={profile?.admission_number}
              />
            </View>
          )}

          {/* Contact Details */}
          <SectionTitle title="Contact Details" />
          <MenuItem
            icon="mail-outline"
            label="Email Address"
            value={profile?.user?.email || user?.email}
          />
          <MenuItem
            icon="call-outline"
            label="Contact Number"
            value={profile?.contact_number || "Not Provided"}
            onPress={handleEditContact}
          />

          {/* Security details for student */}
          {isStudent && (
            <View>
              <SectionTitle title="Security & Devices" />
              <MenuItem
                icon="shield-checkmark-outline"
                label="Face Register Status"
                value={(user?.student_profile?.is_face_registered ?? false) ? "Face Registered" : "Not Registered"}
              />
              <MenuItem
                icon="phone-portrait-outline"
                label="Device Lock Status"
                value={user?.student_profile?.locked_device_id ? "Bound to this device" : "Not Bound"}
              />
            </View>
          )}

          {/* Personal Information */}
          <SectionTitle title="Personal Details" />
          <MenuItem
            icon="male-female-outline"
            label="Gender"
            value={profile?.gender}
          />
          <MenuItem
            icon="gift-outline"
            label="Date of Birth"
            value={profile?.date_of_birth}
          />
          <MenuItem
            icon="flag-outline"
            label="Nationality"
            value={profile?.nationality}
          />
          <MenuItem
            icon="heart-outline"
            label="Blood Group"
            value={profile?.blood_group}
          />

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Footer branding */}
          <Text style={styles.footerText}>
            © 2026 CampusNexus Mobile
          </Text>
        </View>
      </ScrollView>

      {/* Edit Contact Number Modal */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Contact Number</Text>
            <Text style={styles.modalSub}>Enter your mobile/phone number below.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={COLORS.textMuted}
              value={newContactNumber}
              onChangeText={setNewContactNumber}
              keyboardType="phone-pad"
              autoFocus={true}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setEditModalVisible(false)}
                disabled={updatingContact}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveContact}
                disabled={updatingContact}
              >
                {updatingContact ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Save</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#F8FAFC", // Sleek grey slate background
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  heroSection: {
    backgroundColor: COLORS.primary, // Brand Aubergine
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  userSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.white,
  },
  userInfoCol: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 1,
  },
  tenantBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  tenantLogo: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tenantBadgeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  floatingContent: {
    marginTop: -24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 24,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  menuItemNormal: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItemDanger: {
    backgroundColor: "rgba(220, 38, 38, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.15)",
  },
  menuIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconWrapperNormal: {
    backgroundColor: "rgba(74, 21, 75, 0.06)",
  },
  menuIconWrapperDanger: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  menuLabelNormal: {
    color: COLORS.text,
  },
  menuLabelDanger: {
    color: COLORS.error,
  },
  menuValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "500",
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
    marginTop: 24,
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
  footerText: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 32,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    fontWeight: "500",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
    fontWeight: "600",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  modalBtnCancel: {
    backgroundColor: "#F1F5F9",
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  modalBtnSave: {
    backgroundColor: COLORS.primary,
    minWidth: 80,
  },
  modalBtnSaveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ProfileScreen;
