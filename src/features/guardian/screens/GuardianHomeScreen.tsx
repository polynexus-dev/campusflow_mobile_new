import React, { useCallback, useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Modal, TextInput, Alert, Image,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { parentApi, ChildSummary } from "../api/parentApi";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, badgeStyle, BadgeTone, errorMessage } from "@/shared/ui/listStyles";

const ATTENDANCE_TONE: Record<string, BadgeTone> = { Present: "green", Absent: "red", Leave: "amber" };

export const GuardianHomeScreen: React.FC = () => {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [verificationKey, setVerificationKey] = useState("");
  const [linking, setLinking] = useState(false);
  // "Ask the college" fallback: an admin-reviewed request instead of DOB/admission no.
  const [requestMode, setRequestMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setChildren(await parentApi.getChildren());
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your children."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const submitLink = async () => {
    if (!studentId.trim() || !verificationKey.trim()) {
      Alert.alert("Missing details", "Enter the student ID and date of birth or admission number.");
      return;
    }
    try {
      setLinking(true);
      const message = await parentApi.linkChild(studentId.trim(), verificationKey.trim());
      setLinkOpen(false);
      setStudentId("");
      setVerificationKey("");
      Alert.alert("Linked", message);
      fetchData();
    } catch (err) {
      Alert.alert("Couldn't link", errorMessage(err, "Check the details and try again."));
    } finally {
      setLinking(false);
    }
  };

  const submitRequest = async () => {
    if (!studentId.trim() || !phone.trim()) {
      Alert.alert("Missing details", "Enter the student ID and your phone number.");
      return;
    }
    try {
      setLinking(true);
      await parentApi.requestLink(studentId.trim(), phone.trim(), relationship.trim());
      setLinkOpen(false);
      setRequestMode(false);
      setStudentId("");
      setPhone("");
      setRelationship("");
      Alert.alert("Request sent", "You'll get a notification once the college reviews it.");
    } catch (err) {
      Alert.alert("Couldn't send request", errorMessage(err, "Please try again."));
    } finally {
      setLinking(false);
    }
  };

  const inputStyle = {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#0F172A",
  } as const;

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace(ROUTES.AUTH.LOGIN);
        },
      },
    ]);
  };

  const renderChild = ({ item }: { item: ChildSummary }) => {
    const tone = ATTENDANCE_TONE[item.attendance_status] || "gray";
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: "/(guardian)/child/[id]", params: { id: String(item.id), name: item.name } })}
      >
        <View style={s.row}>
          {item.profile_picture ? (
            <Image source={{ uri: item.profile_picture }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3E8F5", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>{item.name.slice(0, 1)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{item.name}</Text>
            <Text style={s.meta}>{item.student_id}</Text>
          </View>
          <View style={badgeStyle(tone).container}>
            <Text style={badgeStyle(tone).text}>TODAY: {item.attendance_status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <Text style={[s.meta, item.fee_due_banner.has_dues && { color: COLORS.error, fontWeight: "600" }]}>
          {item.fee_due_banner.message}
          {item.fee_due_banner.due_date ? ` (due ${item.fee_due_banner.due_date})` : ""}
        </Text>
        {item.bus_tracking && (
          <Text style={s.meta}>
            Bus: {item.bus_tracking.route_name} · {item.bus_tracking.is_live ? "running now" : "not started"}
          </Text>
        )}
        <Text style={s.meta}>{item.unread_announcements_count} announcement(s) this week</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper
      title="My Children"
      showHeader
      style={s.container}
      right={
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => router.push("/(guardian)/notifications")} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmLogout} hitSlop={10}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      }
    >
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderChild}
          contentContainerStyle={[s.listContent, { paddingTop: 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListHeaderComponent={error ? <Text style={s.errorText}>{error}</Text> : null}
          ListEmptyComponent={
            error ? null : (
              <Text style={s.emptyText}>No children linked yet. Tap "Link a child" to add one.</Text>
            )
          }
          ListFooterComponent={
            <TouchableOpacity
              onPress={() => setLinkOpen(true)}
              style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>Link a child</Text>
            </TouchableOpacity>
          }
        />
      )}

      <Modal visible={linkOpen} transparent animationType="slide" onRequestClose={() => { setLinkOpen(false); setRequestMode(false); }}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 }}>
            <Text style={[s.title, { flex: 0, fontSize: 17 }]}>{requestMode ? "Ask the college to link you" : "Link a child"}</Text>
            <TextInput
              placeholder="Student ID (e.g. STU001)"
              placeholderTextColor={COLORS.textMuted}
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="characters"
              style={{ borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#0F172A" }}
            />
            {requestMode ? (
              <>
                <TextInput placeholder="Your phone number" placeholderTextColor={COLORS.textMuted}
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={inputStyle} />
                <TextInput placeholder="Relationship (e.g. Mother)" placeholderTextColor={COLORS.textMuted}
                  value={relationship} onChangeText={setRelationship} style={inputStyle} />
                <Text style={s.meta}>The college will check your details and may ask you to visit with an ID.</Text>
              </>
            ) : (
              <>
                <TextInput
                  placeholder="Date of birth (YYYY-MM-DD) or admission no."
                  placeholderTextColor={COLORS.textMuted}
                  value={verificationKey}
                  onChangeText={setVerificationKey}
                  style={inputStyle}
                />
                <TouchableOpacity onPress={() => setRequestMode(true)}>
                  <Text style={[s.meta, { color: COLORS.primary, textDecorationLine: "underline" }]}>
                    Don't have these? Ask the college to link you instead.
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => (requestMode ? setRequestMode(false) : setLinkOpen(false))}
                style={[s.tabButton, { backgroundColor: "#E2E8F0" }]}
              >
                <Text style={s.tabText}>{requestMode ? "Back" : "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={requestMode ? submitRequest : submitLink} disabled={linking} style={[s.tabButton, s.activeTabButton]}>
                {linking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[s.tabText, s.activeTabText]}>{requestMode ? "Send" : "Link"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default GuardianHomeScreen;
