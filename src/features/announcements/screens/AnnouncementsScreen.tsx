import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { announcementsApi } from "../api/announcementsApi";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";

export const AnnouncementsScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isFacultyOrAbove = user?.role !== "Student";

  // Data States
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States (for creating new announcement)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [targetAudience, setTargetAudience] = useState("All");

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("All");

  const CATEGORIES = ["General", "Academic", "Event", "Exam", "Placement", "Holiday"];
  const AUDIENCES = ["All", "Students", "Faculty"];

  const fetchAnnouncements = async () => {
    try {
      const data = await announcementsApi.getAnnouncements();
      // Handle array or paginated response
      const items = Array.isArray(data) ? data : data.results || [];
      setAnnouncements(items);
    } catch (err: any) {
      console.error("Failed to fetch announcements:", err);
      Alert.alert("Error Loading Announcements", err.message || "Failed to load feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Required Fields", "Please fill in the title and description.");
      return;
    }

    setActionLoading(true);
    try {
      await announcementsApi.createAnnouncement({
        title: title.trim(),
        description: description.trim(),
        category,
        target_audience: targetAudience,
      });
      Alert.alert("Success", "Announcement posted successfully.");
      setTitle("");
      setDescription("");
      setCategory("General");
      setTargetAudience("All");
      setCreateModalVisible(false);
      fetchAnnouncements();
    } catch (err: any) {
      Alert.alert("Post Failed", err.message || err.data?.detail || "Could not publish announcement.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter and search logic
  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedFilterCategory === "All" ||
      ann.category?.toLowerCase() === selectedFilterCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const getCategoryEmoji = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "academic":
        return "📚";
      case "exam":
        return "✍️";
      case "event":
        return "🎉";
      case "placement":
        return "💼";
      case "holiday":
        return "🏝️";
      default:
        return "📢";
    }
  };

  const getCategoryBadgeStyle = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "academic":
        return { bg: "rgba(59, 130, 246, 0.1)", text: "#2563EB" };
      case "exam":
        return { bg: "rgba(220, 38, 38, 0.1)", text: "#DC2626" };
      case "event":
        return { bg: "rgba(16, 185, 129, 0.1)", text: "#059669" };
      case "placement":
        return { bg: "rgba(245, 158, 11, 0.1)", text: "#D97706" };
      case "holiday":
        return { bg: "rgba(107, 114, 128, 0.1)", text: "#4B5563" };
      default:
        return { bg: "rgba(139, 92, 246, 0.1)", text: "#7C3AED" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace(ROUTES.APP.DASHBOARD)}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notice Board</Text>
            <Text style={styles.subtitle}>Official updates & campus announcements</Text>
          </View>
          {isFacultyOrAbove && (
            <TouchableOpacity
              style={styles.composeBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.composeBtnIcon}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search announcements..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[styles.categoryFilterTab, selectedFilterCategory === "All" && styles.activeFilterTab]}
            onPress={() => setSelectedFilterCategory("All")}
          >
            <Text style={[styles.filterTabText, selectedFilterCategory === "All" && styles.activeFilterTabText]}>
              All Notices
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryFilterTab, selectedFilterCategory === cat && styles.activeFilterTab]}
              onPress={() => setSelectedFilterCategory(cat)}
            >
              <Text style={[styles.filterTabText, selectedFilterCategory === cat && styles.activeFilterTabText]}>
                {getCategoryEmoji(cat)} {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching notices...</Text>
        </View>
      ) : filteredAnnouncements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📢</Text>
          <Text style={styles.emptyText}>No Notices Found</Text>
          <Text style={styles.emptySubText}>Check back later for official campus notices.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnnouncements}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => {
            const badgeStyle = getCategoryBadgeStyle(item.category);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.categoryBadgeText, { color: badgeStyle.text }]}>
                      {getCategoryEmoji(item.category)} {item.category?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <View style={styles.divider} />
                <View style={styles.cardFooter}>
                  <Text style={styles.authorText}>Author: {item.author_name || "Admin"}</Text>
                  {item.target_audience && (
                    <Text style={styles.audienceText}>Audience: {item.target_audience}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Compose Announcement Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publish Announcement</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: "85%" }}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter notice title..."
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.formLabel}>Details / Body</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Compose the announcement details..."
                placeholderTextColor={COLORS.textMuted}
                multiline={true}
                numberOfLines={6}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.formLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setCategoryModalVisible(true)}
              >
                <Text style={styles.dropdownText}>{category}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>Target Audience</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setAudienceModalVisible(true)}
              >
                <Text style={styles.dropdownText}>{targetAudience}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, actionLoading && styles.btnDisabled]}
                onPress={handleCreateAnnouncement}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Publish Notice</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Dropdown Modal */}
      <Modal visible={categoryModalVisible} animationType="fade" transparent={true}>
        <View style={styles.dropdownModalBg}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Select Category</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.dropdownItem}
                onPress={() => {
                  setCategory(cat);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Audience Dropdown Modal */}
      <Modal visible={audienceModalVisible} animationType="fade" transparent={true}>
        <View style={styles.dropdownModalBg}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Select Audience</Text>
            {AUDIENCES.map((aud) => (
              <TouchableOpacity
                key={aud}
                style={styles.dropdownItem}
                onPress={() => {
                  setTargetAudience(aud);
                  setAudienceModalVisible(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{aud}</Text>
              </TouchableOpacity>
            ))}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 4,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  composeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  composeBtnIcon: {
    fontSize: 20,
  },
  filterSection: {
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginHorizontal: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 12,
  },
  categoryScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryFilterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeFilterTabText: {
    color: COLORS.white,
    fontWeight: "800",
  },
  listContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "850",
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  audienceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
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
  formLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  dropdownModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    width: "80%",
    padding: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  dropdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
  },
});

export default AnnouncementsScreen;
