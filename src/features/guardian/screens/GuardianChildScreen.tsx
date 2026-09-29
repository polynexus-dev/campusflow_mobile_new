import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  parentApi, ChildAttendance, ChildFeeInvoice, ChildExams, ChildAssignment,
} from "../api/parentApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, badgeStyle, BadgeTone, errorMessage } from "@/shared/ui/listStyles";

type Tab = "attendance" | "fees" | "exams" | "assignments";

const TABS: { key: Tab; label: string }[] = [
  { key: "attendance", label: "Attendance" },
  { key: "fees", label: "Fees" },
  { key: "exams", label: "Exams" },
  { key: "assignments", label: "Tasks" },
];

const DAY_TONE: Record<string, BadgeTone> = { Present: "green", Absent: "red", Leave: "amber", Holiday: "gray" };
const TASK_TONE: Record<string, BadgeTone> = { Graded: "green", Submitted: "amber", Pending: "red" };

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const GuardianChildScreen: React.FC = () => {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const childId = Number(id);
  const [tab, setTab] = useState<Tab>("attendance");
  const [attendance, setAttendance] = useState<ChildAttendance | null>(null);
  const [fees, setFees] = useState<ChildFeeInvoice[] | null>(null);
  const [exams, setExams] = useState<ChildExams | null>(null);
  const [assignments, setAssignments] = useState<ChildAssignment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTab = useCallback(async () => {
    try {
      setError(null);
      if (tab === "attendance") setAttendance(await parentApi.getAttendance(childId));
      if (tab === "fees") setFees(await parentApi.getFees(childId));
      if (tab === "exams") setExams(await parentApi.getExams(childId));
      if (tab === "assignments") setAssignments(await parentApi.getAssignments(childId));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load details."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, childId]);

  useEffect(() => {
    setLoading(true);
    fetchTab();
  }, [fetchTab]);

  const Badge = ({ tone, label }: { tone: BadgeTone; label: string }) => (
    <View style={badgeStyle(tone).container}>
      <Text style={badgeStyle(tone).text}>{label}</Text>
    </View>
  );

  const renderAttendance = () => attendance && (
    <>
      <View style={[s.statRow, { paddingHorizontal: 0, paddingTop: 0 }]}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Last 30 days</Text>
          <Text style={s.statValue}>{attendance.percentage}%</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Days present</Text>
          <Text style={s.statValue}>{attendance.present_days} / {attendance.total_days_evaluated}</Text>
        </View>
      </View>
      {attendance.calendar.filter((d) => d.status !== "Holiday").map((d) => (
        <View key={d.date} style={[s.card, s.row, { paddingVertical: 12 }]}>
          <Text style={s.meta}>
            {new Date(d.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          </Text>
          <Badge tone={DAY_TONE[d.status] || "gray"} label={d.status.toUpperCase()} />
        </View>
      ))}
    </>
  );

  const renderFees = () => fees && (
    fees.length === 0 ? <Text style={s.emptyText}>No fee invoices.</Text> : fees.map((inv) => (
      <View key={inv.id} style={s.card}>
        <View style={s.row}>
          <Text style={s.title}>{inv.invoice_number}</Text>
          <Badge tone={inv.remaining_balance > 0 ? "red" : "green"} label={inv.status.toUpperCase()} />
        </View>
        <Text style={s.meta}>Due {inv.due_date}</Text>
        <View style={s.divider} />
        <Text style={s.meta}>Total {money(inv.total_amount)} · Discount {money(inv.discount_amount)}</Text>
        <Text style={s.meta}>Paid {money(inv.paid_amount)}</Text>
        <Text style={[s.meta, inv.remaining_balance > 0 && { color: COLORS.error, fontWeight: "600" }]}>
          Balance {money(inv.remaining_balance)}
        </Text>
        {inv.payments.map((p) => (
          <Text key={p.receipt_number} style={s.meta}>
            Receipt {p.receipt_number}: {money(p.amount_paid)} via {p.payment_method} on {p.payment_date}
          </Text>
        ))}
      </View>
    ))
  );

  const renderExams = () => exams && (
    <>
      <Text style={s.sectionTitle}>Upcoming</Text>
      {exams.exam_schedule.length === 0 ? <Text style={s.meta}>No upcoming exams.</Text> : exams.exam_schedule.map((e) => (
        <View key={e.id} style={s.card}>
          <Text style={s.title}>{e.subject_name}</Text>
          <Text style={s.meta}>{e.subject_code} · {e.exam_type}</Text>
          <Text style={s.meta}>{e.date} · {e.time} · {e.classroom}</Text>
        </View>
      ))}
      <Text style={s.sectionTitle}>Published results</Text>
      {exams.report_cards.length === 0 ? <Text style={s.meta}>No results published yet.</Text> : exams.report_cards.map((card) => (
        <View key={card.term_name} style={s.card}>
          <View style={s.row}>
            <Text style={s.title}>{card.term_name}</Text>
            <Text style={[s.title, { flex: 0 }]}>{card.percentage}%</Text>
          </View>
          <Text style={s.meta}>{card.total_obtained} / {card.total_max}</Text>
          <View style={s.divider} />
          {card.subjects.map((sub) => (
            <View key={sub.subject_code + sub.subject_name} style={[s.row, { marginBottom: 6 }]}>
              <Text style={[s.meta, { flex: 1 }]}>{sub.subject_name}: {sub.marks_obtained}/{sub.total_marks}</Text>
              <Badge tone={sub.is_pass ? "green" : "red"} label={sub.grade} />
            </View>
          ))}
        </View>
      ))}
    </>
  );

  const renderAssignments = () => assignments && (
    assignments.length === 0 ? <Text style={s.emptyText}>No assignments.</Text> : assignments.map((a) => (
      <View key={a.id} style={s.card}>
        <View style={s.row}>
          <Text style={s.title}>{a.title}</Text>
          <Badge tone={TASK_TONE[a.submission_status] || "gray"} label={a.submission_status.toUpperCase()} />
        </View>
        <Text style={s.meta}>{a.subject} · {a.teacher_name}</Text>
        <Text style={s.meta}>Due {a.due_date}</Text>
        {a.graded_marks != null ? <Text style={s.meta}>Marks: {a.graded_marks}</Text> : null}
        {a.feedback ? <Text style={s.meta}>Feedback: {a.feedback}</Text> : null}
      </View>
    ))
  );

  return (
    <ScreenWrapper title={name || "Child"} showHeader showBack style={s.container}>
      <View style={[s.tabContainer, { gap: 8 }]}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[s.tabButton, tab === t.key && s.activeTabButton]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && s.activeTabText, { fontSize: 12 }]}>{t.label}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTab(); }} />}
        >
          {error ? <Text style={s.errorText}>{error}</Text> : (
            <>
              {tab === "attendance" && renderAttendance()}
              {tab === "fees" && renderFees()}
              {tab === "exams" && renderExams()}
              {tab === "assignments" && renderAssignments()}
            </>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

export default GuardianChildScreen;
