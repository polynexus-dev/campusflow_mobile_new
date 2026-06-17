import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from "react-native";
import { COLORS } from "@/shared/theme/colors";
import { attendanceApi } from "../api/attendanceApi";

export const AttendanceHistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const list = await attendanceApi.getHistory();
        setHistory(list);
      } catch (err) {
        console.error("Failed to load attendance history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verification Log</Text>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No biometric attempts recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, item.is_verified ? styles.successCard : styles.failCard]}>
              <View style={styles.row}>
                <Text style={styles.lectureName}>
                  {item.lecture_info?.course_name || `Lecture #${item.lecture}`}
                </Text>
                <Text style={[styles.status, item.is_verified ? styles.successText : styles.failText]}>
                  {item.is_verified ? "Verified" : "Failed"}
                </Text>
              </View>
              <Text style={styles.lectureCode}>Code: {item.lecture_info?.course_code || "N/A"}</Text>
              <View style={styles.footer}>
                <Text style={styles.date}>
                  {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.confidence}>
                  Match: {(item.confidence_score * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginVertical: 16,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  failCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lectureName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  lectureCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  successText: {
    color: COLORS.success,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  failText: {
    color: COLORS.error,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  confidence: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
export default AttendanceHistoryScreen;
