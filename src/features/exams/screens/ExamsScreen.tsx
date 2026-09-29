import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { examsApi, Exam, ExamResult } from "../api/examsApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, badgeStyle, errorMessage } from "@/shared/ui/listStyles";

const formatTime = (t: string) => (t ? t.slice(0, 5) : "");

export const ExamsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "results">("upcoming");
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [examList, resultList] = await Promise.all([examsApi.getExams(), examsApi.getMyResults()]);
      setExams(examList);
      setResults(resultList);
    } catch (err) {
      setError(errorMessage(err, "Couldn't load exams."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () => exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [exams, today]
  );

  // The results endpoint returns draft marks too; only show published exams.
  const publishedResults = useMemo(() => {
    const published = new Set(exams.filter((e) => e.results_published).map((e) => e.id));
    return results.filter((r) => published.has(r.exam));
  }, [exams, results]);

  const renderExam = ({ item }: { item: Exam }) => {
    const blocked = item.is_detained || item.is_clearance_blocked;
    return (
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.title}>{item.course || item.name}</Text>
          <View style={badgeStyle("gray").container}>
            <Text style={badgeStyle("gray").text}>{item.exam_type}</Text>
          </View>
        </View>
        {item.course_code ? <Text style={s.meta}>{item.course_code} · {item.name}</Text> : null}
        <View style={s.divider} />
        <Text style={s.meta}>
          {new Date(item.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          {"  ·  "}{formatTime(item.start_time)}–{formatTime(item.end_time)}
        </Text>
        <Text style={s.meta}>Room: {item.classroom || "TBA"} · Max {item.total_marks} marks</Text>
        {blocked && (
          <View style={[badgeStyle("red").container, { alignSelf: "flex-start", marginTop: 8 }]}>
            <Text style={badgeStyle("red").text}>
              {item.is_detained ? "DETAINED — attendance below requirement" : "BLOCKED — clearance pending"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderResult = ({ item }: { item: ExamResult }) => {
    const tone = item.is_pass ? "green" : "red";
    return (
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.title}>{item.course_name}</Text>
          <View style={badgeStyle(tone).container}>
            <Text style={badgeStyle(tone).text}>{item.is_pass ? "PASS" : "FAIL"}</Text>
          </View>
        </View>
        <Text style={s.meta}>{item.exam_name}{item.semester ? ` · ${item.semester}` : ""}</Text>
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.meta}>
            {Number(item.marks_obtained)} / {item.total_marks}
            {item.percentage != null ? `  (${Number(item.percentage).toFixed(1)}%)` : ""}
          </Text>
          {item.grade ? <Text style={[s.title, { flex: 0 }]}>Grade {item.grade}</Text> : null}
        </View>
        {item.remarks ? <Text style={s.meta}>{item.remarks}</Text> : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
  );

  return (
    <ScreenWrapper title="Exams & Results" showHeader showBack style={s.container}>
      <View style={s.tabContainer}>
        {(["upcoming", "results"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tabButton, activeTab === tab && s.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.activeTabText]}>
              {tab === "upcoming" ? "Upcoming" : "Results"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : activeTab === "upcoming" ? (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderExam}
          contentContainerStyle={s.listContent}
          refreshControl={refreshControl}
          ListEmptyComponent={<Text style={s.emptyText}>No upcoming exams.</Text>}
        />
      ) : (
        <FlatList
          data={publishedResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderResult}
          contentContainerStyle={s.listContent}
          refreshControl={refreshControl}
          ListEmptyComponent={<Text style={s.emptyText}>No results published yet.</Text>}
        />
      )}
    </ScreenWrapper>
  );
};

export default ExamsScreen;
