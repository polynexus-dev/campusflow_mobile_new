import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";

type ConductedLecture = {
  id: number;
  name: string;
  subject: string;
  classroom_name: string;
  start_time: string;
  end_time: string;
  lecturer_check_in: string;
  student_count: number;
};

type HistoryResponse = {
  total_count: number;
  filtered_count: number;
  lectures: ConductedLecture[];
};

export const LecturerHistoryScreen: React.FC = () => {
  const router = useRouter();

  // Filters State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1); // 1-12, default to current month
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // default to all days

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HistoryResponse | null>(null);

  // Dropdown UI state (simple expand/collapse)
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);

  const years = [2025, 2026, 2027];
  const months = [
    { label: "All Months", value: null },
    { label: "January", value: 1 },
    { label: "February", value: 2 },
    { label: "March", value: 3 },
    { label: "April", value: 4 },
    { label: "May", value: 5 },
    { label: "June", value: 6 },
    { label: "July", value: 7 },
    { label: "August", value: 8 },
    { label: "September", value: 9 },
    { label: "October", value: 10 },
    { label: "November", value: 11 },
    { label: "December", value: 12 },
  ];

  // Generate 1 to 31
  const days: { label: string; value: number | null }[] = [
    { label: "All Days", value: null },
    ...Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
  ];

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = { year: selectedYear };
      if (selectedMonth !== null) filters.month = selectedMonth;
      if (selectedDay !== null) filters.day = selectedDay;

      const res = await attendanceApi.getLecturerConductedHistory(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch lecturer conducted history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getMonthLabel = (value: number | null) => {
    const found = months.find((m) => m.value === value);
    return found ? found.label : "All Months";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conducted Lectures</Text>
        <Text style={styles.headerSubtitle}>
          View and analyze the report of classes you have conducted.
        </Text>
      </View>

      {/* Inline Filters Panel */}
      <View style={styles.filtersContainer}>
        {/* Year Dropdown */}
        <View style={styles.filterBox}>
          <Text style={styles.filterLabel}>Year</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => {
              setShowYearDropdown(!showYearDropdown);
              setShowMonthDropdown(false);
              setShowDayDropdown(false);
            }}
          >
            <Text style={styles.dropdownValue}>{selectedYear}</Text>
            <Text style={styles.dropdownChevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Month Dropdown */}
        <View style={styles.filterBox}>
          <Text style={styles.filterLabel}>Month</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => {
              setShowMonthDropdown(!showMonthDropdown);
              setShowYearDropdown(false);
              setShowDayDropdown(false);
            }}
          >
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {getMonthLabel(selectedMonth)}
            </Text>
            <Text style={styles.dropdownChevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Day Dropdown */}
        <View style={styles.filterBox}>
          <Text style={styles.filterLabel}>Day</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => {
              setShowDayDropdown(!showDayDropdown);
              setShowYearDropdown(false);
              setShowMonthDropdown(false);
            }}
          >
            <Text style={styles.dropdownValue}>
              {selectedDay === null ? "All" : selectedDay}
            </Text>
            <Text style={styles.dropdownChevron}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Dropdowns Overlay */}
      {showYearDropdown && (
        <View style={[styles.dropdownMenu, { left: 20 }]}>
          {years.map((y) => (
            <TouchableOpacity
              key={y}
              style={styles.dropdownOption}
              onPress={() => {
                setSelectedYear(y);
                setShowYearDropdown(false);
              }}
            >
              <Text style={[styles.dropdownOptionText, selectedYear === y && styles.dropdownOptionActive]}>
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showMonthDropdown && (
        <View style={[styles.dropdownMenu, { left: "30%" }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {months.map((m) => (
              <TouchableOpacity
                key={m.label}
                style={styles.dropdownOption}
                onPress={() => {
                  setSelectedMonth(m.value);
                  setShowMonthDropdown(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedMonth === m.value && styles.dropdownOptionActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showDayDropdown && (
        <View style={[styles.dropdownMenu, { right: 20 }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {days.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={styles.dropdownOption}
                onPress={() => {
                  setSelectedDay(d.value);
                  setShowDayDropdown(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedDay === d.value && styles.dropdownOptionActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main List & Report view */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Analytics Card */}
        {data && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Conducted</Text>
              <Text style={styles.statValue}>{data.total_count}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Filtered period</Text>
              <Text style={styles.statValue}>{data.filtered_count} class{data.filtered_count === 1 ? "" : "es"}</Text>
            </View>
          </View>
        )}

        {/* Loading Spinner */}
        {loading && !refreshing && (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        )}

        {/* Empty list state */}
        {!loading && data && data.lectures.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No conducted classes found.</Text>
            <Text style={styles.emptySubtext}>
              No session check-ins were registered for this selected date filter.
            </Text>
          </View>
        )}

        {/* Lectures List */}
        {!loading && data && data.lectures.map((lec) => (
          <View key={lec.id} style={styles.lectureCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.lectureSubject}>{lec.subject}</Text>
              <Text style={styles.classroomText}>📍 Room: {lec.classroom_name}</Text>
            </View>
            <Text style={styles.lectureName}>{lec.name}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.footerLabel}>Class Date & Schedule</Text>
                <Text style={styles.footerValue}>
                  📅 {formatDate(lec.start_time)} | {formatTime(lec.start_time)} - {formatTime(lec.end_time)}
                </Text>
              </View>
            </View>

            <View style={styles.cardCheckinRow}>
              <View>
                <Text style={styles.footerLabel}>Lecturer Checked-In At</Text>
                <Text style={styles.checkinValue}>
                  🕒 {new Date(lec.lecturer_check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <View style={styles.attendanceTally}>
                <Text style={styles.tallyCount}>{lec.student_count}</Text>
                <Text style={styles.tallyLabel}>Present</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  filtersContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  filterBox: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dropdownSelector: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  dropdownChevron: {
    fontSize: 8,
    color: COLORS.textSecondary,
  },
  dropdownMenu: {
    position: "absolute",
    top: 178,
    width: "30%",
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    zIndex: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: "hidden",
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  dropdownOptionActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: COLORS.border,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  lectureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lectureSubject: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classroomText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  lectureName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  cardCheckinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  checkinValue: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  attendanceTally: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tallyCount: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.success,
  },
  tallyLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
  },
});

export default LecturerHistoryScreen;
