import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { ROUTES } from "@/constants/route";

export const TimetableScreen: React.FC = () => {
  const router = useRouter();
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLectures = async () => {
      setLoading(true);
      try {
        const res = await attendanceApi.getLectures();
        const data = res.results || res;
        setLectures(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Error Loading Timetable Lectures:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLectures();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };


  return (
    <ScreenWrapper
      title="All Lectures"
      showHeader={true}
      showBack={true}
      style={styles.container}
      disableBottomPadding={true}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Text style={styles.subtitle}>List of all scheduled lectures and classrooms</Text>

      {/* Timetable List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching lectures...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          <Text style={styles.dayHeader}>Lectures</Text>
          
          {lectures.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No lectures scheduled.</Text>
            </View>
          ) : (
            lectures.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.scheduleCard}
                activeOpacity={0.7}
                onPress={() => {
                  router.push({
                    pathname: ROUTES.APP.MARK_ATTENDANCE,
                    params: { lectureId: item.id.toString() }
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.courseCode}>{item.code || item.subject || "CLASS"}</Text>
                  <View style={styles.timeTag}>
                    <Text style={styles.timeTagText}>
                      {formatDate(item.start_time)}, {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.courseName}>{item.name}</Text>
                
                <View style={styles.divider} />
                
                <View style={styles.cardFooter}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>CLASSROOM</Text>
                    <Text style={styles.infoVal}>
                      {item.classroom_name || "TBD"}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>INSTRUCTOR</Text>
                    <Text style={styles.infoVal}>{item.teacher_name || "Staff"}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 24,
    marginVertical: 12,
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
