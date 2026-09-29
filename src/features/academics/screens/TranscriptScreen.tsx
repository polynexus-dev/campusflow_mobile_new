import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { academicsApi, Transcript } from "../api/academicsApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, badgeStyle, errorMessage } from "@/shared/ui/listStyles";

export const TranscriptScreen: React.FC = () => {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setTranscript(await academicsApi.getMyTranscript());
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your transcript."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Transcript" showHeader showBack style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {error || !transcript ? (
          <Text style={s.errorText}>{error || "No transcript available."}</Text>
        ) : (
          <>
            <View style={s.statRow}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>CGPA</Text>
                <Text style={s.statValue}>{transcript.cgpa != null ? transcript.cgpa.toFixed(2) : "—"}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Credits earned</Text>
                <Text style={s.statValue}>{transcript.credits_earned}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Backlogs</Text>
                <Text style={[s.statValue, transcript.active_backlog_count > 0 && { color: COLORS.error }]}>
                  {transcript.active_backlog_count}
                </Text>
              </View>
            </View>

            <View style={[s.listContent, { paddingTop: 16 }]}>
              {transcript.terms.length === 0 ? (
                <Text style={s.emptyText}>No published semester results yet.</Text>
              ) : (
                transcript.terms.map((term) => (
                  <View key={term.id} style={s.card}>
                    <View style={s.row}>
                      <Text style={s.title}>
                        {term.semester_number ? `Semester ${term.semester_number}` : term.term_name}
                      </Text>
                      <Text style={[s.title, { flex: 0 }]}>SGPA {term.sgpa != null ? term.sgpa.toFixed(2) : "—"}</Text>
                    </View>
                    <Text style={s.meta}>
                      {term.academic_year_name} · {term.term_name} · {term.credits_earned}/{term.credits_registered} credits
                      {term.backlog_count > 0 ? ` · ${term.backlog_count} backlog(s)` : ""}
                    </Text>
                    <View style={s.divider} />
                    {term.courses.map((c) => {
                      const tone = c.is_pass ? "green" : "red";
                      return (
                        <View key={c.id} style={[s.row, { marginBottom: 8 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>{c.course_name}</Text>
                            <Text style={s.meta}>
                              {c.course_code} · {c.credits} cr
                              {c.total_marks != null && c.max_marks != null ? ` · ${c.total_marks}/${c.max_marks}` : ""}
                              {c.attempt_number > 1 ? ` · attempt ${c.attempt_number}` : ""}
                            </Text>
                          </View>
                          <View style={badgeStyle(tone).container}>
                            <Text style={badgeStyle(tone).text}>{c.grade_letter}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

export default TranscriptScreen;
