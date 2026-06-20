import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { timetableApi } from "../api/timetableApi";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const TimetableScreen: React.FC = () => {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Set today's day as default if possible
  useEffect(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];
    if (DAYS_OF_WEEK.includes(today)) {
      setSelectedDay(today);
    }
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const data = await timetableApi.getSchedules();
        setSchedules(data);
      } catch (err: any) {
        Alert.alert("Error Loading Timetable", err.message || "Failed to load class schedules.");
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const filteredSchedules = schedules.filter(s => s.day_of_week === selectedDay);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    // e.g. "09:00:00" -> "09:00 AM"
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Weekly Timetable</Text>
        <Text style={styles.subtitle}>Your scheduled lectures and classrooms</Text>
      </View>

      {/* Day Selector Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <TouchableOpacity
                key={day}
                activeOpacity={0.8}
                onPress={() => setSelectedDay(day)}
                style={[styles.tab, isSelected && styles.activeTab]}
              >
                <Text style={[styles.tabText, isSelected && styles.activeTabText]}>{day.substring(0, 3)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timetable List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching timetable...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          <Text style={styles.dayHeader}>{selectedDay}'s Classes</Text>
          
          {filteredSchedules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No classes scheduled for {selectedDay}.</Text>
              <Text style={styles.emptySubText}>Use this day to catch up on assignments!</Text>
            </View>
          ) : (
            filteredSchedules.map((item) => (
              <View key={item.id} style={styles.scheduleCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.courseCode}>{item.course_code}</Text>
                  <View style={styles.timeTag}>
                    <Text style={styles.timeTagText}>
                      {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.courseName}>{item.course_name}</Text>
                
                <View style={styles.divider} />
                
                <View style={styles.cardFooter}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CLASSROOM</Text>
                    <Text style={styles.infoVal}>
                      {item.classroom_name ? `${item.classroom_name} (${item.classroom_code || "N/A"})` : "TBD"}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>INSTRUCTOR</Text>
                    <Text style={styles.infoVal}>{item.faculty_name || "Staff"}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
  tabsContainer: {
    height: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeTab: {
    backgroundColor: "rgba(74, 21, 75, 0.15)",
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  activeTabText: {
    color: COLORS.primary,
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
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  scheduleCard: {
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
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    backgroundColor: "rgba(74, 21, 75, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeTagText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  courseName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default TimetableScreen;
