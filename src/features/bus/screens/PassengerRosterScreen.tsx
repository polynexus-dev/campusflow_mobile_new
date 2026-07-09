import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TextInput, ActivityIndicator, FlatList } from "react-native";
import { busApi, BusPassenger } from "../services/busApi";
import { COLORS } from "@/shared/theme/colors";
import { ScreenWrapper } from "@/shared/ui/ScreenWrapper";

export const PassengerRosterScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<BusPassenger[]>([]);
  const [routeName, setRouteName] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await busApi.getDriverDashboard();
        setPassengers(data.passengers || []);
        setRouteName(data.route_name);
      } catch (err) {
        console.error("Failed to load passenger roster:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return passengers;
    const q = search.trim().toLowerCase();
    return passengers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.boarding_stop.toLowerCase().includes(q)
    );
  }, [passengers, search]);

  const boardedCount = passengers.filter((p) => p.boarded_today).length;

  const renderItem = ({ item }: { item: BusPassenger }) => (
    <View style={styles.rosterRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rosterName}>{item.name}</Text>
        <Text style={styles.rosterMeta}>
          {item.role} · {item.boarding_stop}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={item.boarded_today ? styles.rosterBoarded : styles.rosterNotBoarded}>
          {item.boarded_today ? "Boarded" : "Not boarded"}
        </Text>
        {item.fee_status === "pending" ? (
          <Text style={styles.feePending}>Pending ₹{item.balance_fee}</Text>
        ) : item.fee_status === "paid" ? (
          <Text style={styles.feePaid}>Fees Paid</Text>
        ) : (
          <Text style={styles.feePayroll}>Payroll Deduction</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Passenger Roster" showHeader showBack={false} style={styles.container}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{routeName}</Text>
        <Text style={styles.summaryCount}>
          {boardedCount} / {passengers.length} boarded today
        </Text>
      </View>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or stop"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.user_id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No passengers found.</Text>}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  rosterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  rosterMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  rosterBoarded: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2e7d32",
  },
  rosterNotBoarded: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  feePending: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c62828",
  },
  feePaid: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2e7d32",
  },
  feePayroll: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 40,
  },
});

export default PassengerRosterScreen;
