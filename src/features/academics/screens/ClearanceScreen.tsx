import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { academicsApi, ClearanceStatus, ClearanceCertificate } from "../api/academicsApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, badgeStyle, BadgeTone, errorMessage } from "@/shared/ui/listStyles";

type Cycle = "periodic" | "final_exit";

const ITEM_TONES: Record<string, BadgeTone> = {
  cleared: "green",
  pending: "amber",
  rejected: "red",
};

// No-dues status: "periodic" gates exams/promotion each term, "final_exit"
// is the leaving-college clearance that unlocks the certificate.
export const ClearanceScreen: React.FC = () => {
  const [cycle, setCycle] = useState<Cycle>("periodic");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [certificate, setCertificate] = useState<ClearanceCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setStatus(await academicsApi.getMyClearance(cycle));
      if (cycle === "final_exit") {
        setCertificate(await academicsApi.getMyClearanceCertificate().catch(() => null));
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your clearance status."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cycle]);

  useEffect(() => {
    setLoading(true);
    setCertificate(null);
    fetchData();
  }, [fetchData]);

  const request = status?.request;

  return (
    <ScreenWrapper title="Clearance (No Dues)" showHeader showBack style={s.container}>
      <View style={s.tabContainer}>
        {(["periodic", "final_exit"] as const).map((c) => (
          <TouchableOpacity key={c} style={[s.tabButton, cycle === c && s.activeTabButton]} onPress={() => setCycle(c)}>
            <Text style={[s.tabText, cycle === c && s.activeTabText]}>{c === "periodic" ? "This term" : "Final exit"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.listContent, { paddingTop: 8 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          {error ? (
            <Text style={s.errorText}>{error}</Text>
          ) : (
            <>
              <View style={[s.card, { borderColor: status?.is_cleared ? "#86EFAC" : "#FCD34D" }]}>
                <Text style={s.title}>{status?.is_cleared ? "You're cleared" : "Clearance pending"}</Text>
                <Text style={s.meta}>
                  {request
                    ? `${request.academic_year_name || ""}${request.term_name ? ` · ${request.term_name}` : ""}`
                    : "No clearance request has been generated for you yet."}
                </Text>
                {!status?.is_cleared && request && (
                  <Text style={[s.meta, { marginTop: 6 }]}>
                    Visit each pending desk below to clear your dues. Pending clearance can block exams and promotion.
                  </Text>
                )}
              </View>

              {request?.items.map((item) => {
                const tone = ITEM_TONES[item.status] || "gray";
                return (
                  <View key={item.id} style={s.card}>
                    <View style={s.row}>
                      <Text style={s.title}>{item.desk_name}</Text>
                      <View style={badgeStyle(tone).container}>
                        <Text style={badgeStyle(tone).text}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    {item.remarks ? <Text style={s.meta}>{item.remarks}</Text> : null}
                    {item.cleared_at ? (
                      <Text style={s.meta}>
                        Cleared {new Date(item.cleared_at).toLocaleDateString()}
                        {item.cleared_by_name ? ` by ${item.cleared_by_name}` : ""}
                      </Text>
                    ) : null}
                  </View>
                );
              })}

              {cycle === "final_exit" && certificate && (
                <View style={[s.card, { borderColor: "#86EFAC" }]}>
                  <Text style={s.title}>No-dues certificate</Text>
                  <Text style={s.meta}>
                    {certificate.student_name} ({certificate.student_id}){certificate.department ? ` · ${certificate.department}` : ""}
                  </Text>
                  <Text style={s.meta}>Cleared on {new Date(certificate.cleared_on).toLocaleDateString()}</Text>
                  <View style={s.divider} />
                  {certificate.desks.map((d) => (
                    <Text key={d.desk} style={s.meta}>
                      ✓ {d.desk}{d.cleared_by ? ` — ${d.cleared_by}` : ""}
                    </Text>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

export default ClearanceScreen;
