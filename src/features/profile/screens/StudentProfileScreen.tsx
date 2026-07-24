import React, { useState, useEffect, useCallback, useRef } from "react";
import {
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
  Animated,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
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

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        overflow: "hidden",
        borderRadius: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 16,
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
          },
          android: {
            elevation: 2,
          },
        }),
      }}
    >
      {children}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={{ marginTop: 20, marginBottom: 10, marginLeft: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 }}>
        {title}
      </Text>
    </View>
  );
}

function ProfileActionItem({
  icon,
  label,
  value,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress?: () => void;
  danger?: boolean;
}) {
  const isClickable = !!onPress;

  return (
    <TouchableOpacity
      activeOpacity={isClickable ? 0.75 : 1}
      onPress={onPress}
      disabled={!isClickable}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#ffffff",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: danger ? "rgba(220, 38, 38, 0.05)" : "rgba(74, 21, 75, 0.06)",
          }}
        >
          <Ionicons
            name={icon}
            size={18}
            color={danger ? "#dc2626" : "#4a154b"}
          />
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: danger ? "#dc2626" : "#1f2937",
            }}
          >
            {label}
          </Text>
          {!!value && (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                color: "#64748b",
                marginTop: 2,
                fontWeight: "600",
              }}
            >
              {value}
            </Text>
          )}
        </View>
      </View>
      {isClickable && !danger && (
        <Ionicons name="chevron-forward" size={16} color="#cccccc" style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  );
}

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
      StatusBar.setBarStyle("dark-content");
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
      setProfile((prev) =>
        prev ? { ...prev, contact_number: newContactNumber } : null
      );
      setEditModalVisible(false);
      Alert.alert("Success", "Contact number updated successfully.");
    } catch (err: any) {
      logError(err, "ProfileScreen:handleSaveContact");
      Alert.alert(
        "Error",
        err.response?.data?.detail ||
          err.message ||
          "Failed to update contact number."
      );
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

  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const stickyOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(stickyOpacity, {
      toValue: showStickyHeader ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showStickyHeader]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowStickyHeader(offsetY > 80);
  };

  const displayName = profile?.user
    ? `${profile.user.first_name || ""} ${profile.user.last_name || ""}`.trim() ||
      profile.user.username
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color="#4a154b" />
        <Text style={{ marginTop: 12, color: "#94a3b8", fontSize: 14, fontWeight: "600" }}>
          Loading profile…
        </Text>
      </View>
    );
  }

  const stat1Label = isStudent ? "Semester" : "Position";
  const stat1Value = isStudent
    ? profile?.current_semester_year || "—"
    : profile?.role || user?.role || "—";

  const stat2Label = isStudent ? "Section" : "College";
  const stat2Value = isStudent ? profile?.section_division || "—" : profile?.tenant || "—";

  const stat3Label = isStudent ? "Student ID" : "User ID";
  const stat3Value = isStudent
    ? profile?.student_id || user?.student_profile?.student_id || "—"
    : profile?.user?.username || user?.username || "—";

  const academicItems = [
    {
      icon: "book-outline" as const,
      label: "Program Enrolled",
      value: profile?.program_enrolled_in,
    },
    { icon: "business-outline" as const, label: "Department", value: profile?.department },
    {
      icon: "calendar-outline" as const,
      label: "Academic Year",
      value: profile?.batch_academic_year,
    },
    {
      icon: "grid-outline" as const,
      label: "Section / Division",
      value: profile?.section_division,
    },
    {
      icon: "id-card-outline" as const,
      label: "Admission Number",
      value: profile?.admission_number,
    },
  ].filter((item) => !!item.value);

  const contactItems = [
    {
      icon: "mail-outline" as const,
      label: "Email Address",
      value: profile?.user?.email || user?.email,
    },
    {
      icon: "call-outline" as const,
      label: "Contact Number",
      value: profile?.contact_number || "Not Provided",
      onPress: handleEditContact,
    },
  ].filter((item) => !!item.value || !!item.onPress);

  const securityItems = isStudent
    ? [
        {
          icon: "shield-checkmark-outline" as const,
          label: "Face Register Status",
          value: (user?.student_profile?.is_face_registered ?? false)
            ? "Face Registered"
            : "Not Registered",
        },
        {
          icon: "phone-portrait-outline" as const,
          label: "Device Lock Status",
          value: user?.student_profile?.locked_device_id
            ? "Bound to this device"
            : "Not Bound",
        },
      ]
    : [];

  const personalItems = [
    { icon: "male-female-outline" as const, label: "Gender", value: profile?.gender },
    { icon: "gift-outline" as const, label: "Date of Birth", value: profile?.date_of_birth },
    { icon: "flag-outline" as const, label: "Nationality", value: profile?.nationality },
    { icon: "heart-outline" as const, label: "Blood Group", value: profile?.blood_group },
  ].filter((item) => !!item.value);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Sticky Header */}
      <Animated.View
        pointerEvents={showStickyHeader ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingTop: insets.top,
          opacity: stickyOpacity,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: {
              elevation: 3,
            },
          }),
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, height: 64 }}>
          {router.canGoBack() ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#f8fafc",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={22} color="#1f2937" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <Text style={{ fontSize: 16, fontWeight: "800", color: "#1f2937" }}>
            My Profile
          </Text>

          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ flex: 1, backgroundColor: "#F8FAFC" }}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {/* Header Section Background */}
        <View style={{ paddingTop: insets.top, paddingBottom: 24, backgroundColor: "#fcfaff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
          {/* Custom Header Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, height: 64 }}>
            {router.canGoBack() ? (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#ffffff",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  alignItems: "center",
                  justifyContent: "center",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                }}
                hitSlop={10}
              >
                <Ionicons name="arrow-back" size={22} color="#1f2937" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1f2937" }}>
              My Profile
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* User profile details */}
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#4a154b",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 4,
                borderColor: "#ffffff",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "900" }}>{initials}</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#1f2937", marginTop: 16, textAlign: "center", paddingHorizontal: 16 }}>
              {displayName}
            </Text>
            
            <View style={{ backgroundColor: "#f5ebfa", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, marginTop: 8 }}>
              <Text style={{ color: "#4a154b", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 }}>
                {role}
              </Text>
            </View>

            {profile?.tenant && (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginTop: 12, maxWidth: "85%" }}>
                {user?.tenant_logo ? (
                  <Image
                    source={{ uri: user.tenant_logo }}
                    style={{ width: 16, height: 16, borderRadius: 4, marginRight: 6 }}
                  />
                ) : (
                  <Ionicons
                    name="business-outline"
                    size={12}
                    color="#64748b"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text numberOfLines={1} style={{ color: "#475569", fontSize: 11, fontWeight: "700" }}>
                  {profile.tenant}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {/* Stats Bar */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 16,
              paddingHorizontal: 8,
              marginTop: 12,
              marginBottom: 16,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                },
                android: {
                  elevation: 2,
                },
              }),
            }}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: "#1f2937", textAlign: "center" }}>
                {stat1Value}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, textAlign: "center" }}>
                {stat1Label}
              </Text>
            </View>
            
            <View style={{ width: 1, height: 24, backgroundColor: "#e2e8f0" }} />
            
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: "#1f2937", textAlign: "center" }}>
                {stat2Value}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, textAlign: "center" }}>
                {stat2Label}
              </Text>
            </View>
            
            <View style={{ width: 1, height: 24, backgroundColor: "#e2e8f0" }} />
            
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 14, fontWeight: "800", color: "#1f2937", textAlign: "center", paddingHorizontal: 4 }}>
                {stat3Value}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, textAlign: "center" }}>
                {stat3Label}
              </Text>
            </View>
          </View>

          {/* Academic Info */}
          {academicItems.length > 0 && (
            <>
              <SectionTitle title="Academic Information" />
              <CardShell>
                {academicItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    {index > 0 && <View style={{ height: 1, backgroundColor: "#f1f5f9", marginLeft: 66 }} />}
                    <ProfileActionItem
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                    />
                  </React.Fragment>
                ))}
              </CardShell>
            </>
          )}

          {/* Contact Details */}
          {contactItems.length > 0 && (
            <>
              <SectionTitle title="Contact Details" />
              <CardShell>
                {contactItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    {index > 0 && <View style={{ height: 1, backgroundColor: "#f1f5f9", marginLeft: 66 }} />}
                    <ProfileActionItem
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                      onPress={item.onPress}
                    />
                  </React.Fragment>
                ))}
              </CardShell>
            </>
          )}

          {/* Security & Devices */}
          {securityItems.length > 0 && (
            <>
              <SectionTitle title="Security & Devices" />
              <CardShell>
                {securityItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    {index > 0 && <View style={{ height: 1, backgroundColor: "#f1f5f9", marginLeft: 66 }} />}
                    <ProfileActionItem
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                    />
                  </React.Fragment>
                ))}
              </CardShell>
            </>
          )}

          {/* Personal Details */}
          {personalItems.length > 0 && (
            <>
              <SectionTitle title="Personal Details" />
              <CardShell>
                {personalItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    {index > 0 && <View style={{ height: 1, backgroundColor: "#f1f5f9", marginLeft: 66 }} />}
                    <ProfileActionItem
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                    />
                  </React.Fragment>
                ))}
              </CardShell>
            </>
          )}

          {/* Logout Section */}
          <SectionTitle title="Account" />
          <CardShell>
            <ProfileActionItem
              icon="log-out-outline"
              label="Sign Out"
              danger
              onPress={handleLogout}
            />
          </CardShell>

          {/* Footer branding */}
          <Text style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 32, fontWeight: "600" }}>
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
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <View style={{ width: "100%", backgroundColor: "#ffffff", borderRadius: 24, padding: 24, elevation: 5 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1f2937", marginBottom: 6 }}>
              Update Contact Number
            </Text>
            <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 20, fontWeight: "600" }}>
              Enter your mobile/phone number below.
            </Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, color: "#1f2937", backgroundColor: "#f8fafc", marginBottom: 20, fontWeight: "600" }}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor="#94a3b8"
              value={newContactNumber}
              onChangeText={setNewContactNumber}
              keyboardType="phone-pad"
              autoFocus={true}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }}
                onPress={() => setEditModalVisible(false)}
                disabled={updatingContact}
              >
                <Text style={{ color: "#64748b", fontSize: 14, fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#4a154b", minWidth: 80, marginLeft: 12 }}
                onPress={handleSaveContact}
                disabled={updatingContact}
              >
                {updatingContact ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileScreen;
