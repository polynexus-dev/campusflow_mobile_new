import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { assignmentsApi } from "../api/assignmentsApi";
import { ROUTES } from "@/constants/route";

export const AssignmentsListScreen: React.FC = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await assignmentsApi.getAssignments();
      setAssignments(data);
    } catch (err: any) {
      Alert.alert("Error Loading Assignments", err.message || "Failed to load assignments list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const getDaysRemaining = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    // Reset time components
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true, isCritical: true };
    } else if (diffDays === 0) {
      return { text: "Due Today", isOverdue: false, isCritical: true };
    } else if (diffDays === 1) {
      return { text: "Due Tomorrow", isOverdue: false, isCritical: true };
    } else {
      return { text: `${diffDays} days left`, isOverdue: false, isCritical: false };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace(ROUTES.APP.DASHBOARD)}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Assignments</Text>
        <Text style={styles.subtitle}>Track and submit your coursework tasks</Text>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyText}>All Caught Up!</Text>
          <Text style={styles.emptySubText}>No assignments posted for your department.</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const dueInfo = getDaysRemaining(item.due_date);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.card}
                onPress={() => router.push(`/(student)/assignments/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.courseTag}>{item.course_code}</Text>
                  <View style={[
                    styles.dueBadge,
                    dueInfo.isCritical && styles.dueBadgeCritical,
                    dueInfo.isOverdue && styles.dueBadgeOverdue
                  ]}>
                    <Text style={[
                      styles.dueBadgeText,
                      dueInfo.isCritical && styles.dueBadgeTextCritical
                    ]}>
                      {dueInfo.text}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                
                <View style={styles.divider} />
                
                <View style={styles.cardFooter}>
                  <Text style={styles.facultyText}>Posted by: {item.created_by}</Text>
                  <Text style={styles.dateText}>
                    Due: {new Date(item.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  listContent: {
    padding: 24,
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
    elevation: 4,
    shadowColor: COLORS.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  courseTag: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.12)", // Translucent purple matching primary
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dueBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dueBadgeCritical: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  dueBadgeOverdue: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  dueBadgeTextCritical: {
    color: COLORS.warning,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  facultyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});

export default AssignmentsListScreen;
