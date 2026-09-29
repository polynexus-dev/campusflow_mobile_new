import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { payrollApi, Payslip } from "../api/payrollApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";
import { listStyles as s, badgeStyle, errorMessage } from "@/shared/ui/listStyles";

const money = (v: string | number) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const monthName = (m: number, y: number) =>
  new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

const DetailRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <View style={[s.row, { marginTop: 4 }]}>
    <Text style={s.meta}>{label}</Text>
    <Text style={[s.meta, strong && { color: "#0F172A", fontWeight: "bold", fontSize: 14 }]}>{value}</Text>
  </View>
);

export const PayslipsScreen: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await payrollApi.getPayslips();
      setPayslips([...data].sort((a, b) => b.year - a.year || b.month - a.month));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load payslips."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderItem = ({ item }: { item: Payslip }) => {
    const open = expanded === item.id;
    const tone = item.status?.toLowerCase() === "paid" ? "green" : "amber";
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => setExpanded(open ? null : item.id)}>
        <View style={s.row}>
          <Text style={s.title}>{monthName(item.month, item.year)}</Text>
          <View style={badgeStyle(tone).container}>
            <Text style={badgeStyle(tone).text}>{(item.status || "").toUpperCase()}</Text>
          </View>
        </View>
        <DetailRow label="Net pay" value={money(item.net_payable)} strong />
        {open && (
          <>
            <View style={s.divider} />
            <DetailRow label="Gross salary" value={money(item.gross_salary)} />
            <DetailRow label="PF" value={`− ${money(item.pf_deduction)}`} />
            <DetailRow label="ESI" value={`− ${money(item.esi_deduction)}`} />
            <DetailRow label="TDS" value={`− ${money(item.tds_deduction)}`} />
            <DetailRow label="Absence deduction" value={`− ${money(item.absence_deduction)}`} />
            <DetailRow label="Total deductions" value={`− ${money(item.total_deductions)}`} />
            <View style={s.divider} />
            <DetailRow
              label="Days"
              value={`${item.present_days} present · ${item.leave_days} leave · ${item.absent_days} absent / ${item.total_working_days}`}
            />
            <Text style={[s.meta, { marginTop: 6 }]}>Generated {new Date(item.generated_on).toLocaleDateString()}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Payslips" showHeader showBack style={s.container}>
      {error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={payslips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[s.listContent, { paddingTop: 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={<Text style={s.emptyText}>No payslips yet.</Text>}
        />
      )}
    </ScreenWrapper>
  );
};

export default PayslipsScreen;
