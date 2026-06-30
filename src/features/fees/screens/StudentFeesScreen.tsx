import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { feeApi, FeeInvoice, FeePaymentReceipt } from "../services/feeApi";
import { COLORS } from "@/shared/theme/colors";

export const StudentFeesScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dues" | "receipts">("dues");
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [payments, setPayments] = useState<FeePaymentReceipt[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invs, pmts] = await Promise.all([
        feeApi.getInvoices(),
        feeApi.getPayments(),
      ]);
      setInvoices(invs);
      setPayments(pmts);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to load fee information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderInvoiceItem = ({ item }: { item: FeeInvoice }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
        <View
          style={[
            styles.badge,
            item.status === "paid"
              ? styles.badgePaid
              : item.status === "partially_paid"
              ? styles.badgePartial
              : styles.badgeUnpaid,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              item.status === "paid"
                ? styles.textPaid
                : item.status === "partially_paid"
                ? styles.textPartial
                : styles.textUnpaid,
            ]}
          >
            {item.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        <View style={styles.col}>
          <Text style={styles.label}>Billed Total</Text>
          <Text style={styles.val}>₹{item.total_amount}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Paid Amount</Text>
          <Text style={[styles.val, { color: "#16A34A" }]}>₹{item.paid_amount}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Dues / Balance</Text>
          <Text style={[styles.val, { color: "#DC2626", fontWeight: "bold" }]}>
            ₹{item.remaining_balance}
          </Text>
        </View>
      </View>

      <Text style={styles.dueDate}>Due Date: {new Date(item.due_date).toLocaleDateString()}</Text>
    </View>
  );

  const renderReceiptItem = ({ item }: { item: FeePaymentReceipt }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.receiptNum}>{item.receipt_number}</Text>
        <Text style={styles.amount}>+ ₹{item.amount_paid}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.metaText}>Invoice Number: {item.invoice_number}</Text>
      <Text style={styles.metaText}>Payment Method: {item.payment_method.toUpperCase()}</Text>
      {item.transaction_reference ? (
        <Text style={styles.metaText}>Ref ID: {item.transaction_reference}</Text>
      ) : null}
      <Text style={styles.dateText}>
        Date: {new Date(item.payment_date).toLocaleDateString()} at{" "}
        {new Date(item.payment_date).toLocaleTimeString()}
      </Text>
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
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "dues" && styles.activeTabButton]}
          onClick={() => setActiveTab("dues")}
        >
          <Text style={[styles.tabText, activeTab === "dues" && styles.activeTabText]}>Dues & Invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "receipts" && styles.activeTabButton]}
          onClick={() => setActiveTab("receipts")}
        >
          <Text style={[styles.tabText, activeTab === "receipts" && styles.activeTabText]}>Receipt History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "dues" ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvoiceItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No invoices/billing records found.</Text>
          }
        />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReceiptItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No payment history records found.</Text>
          }
        />
      )}
    </View>
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
  tabContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#475569",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceNum: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
  },
  receiptNum: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
  },
  amount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#16A34A",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePaid: {
    backgroundColor: "#DCFCE7",
  },
  badgePartial: {
    backgroundColor: "#FEF9C3",
  },
  badgeUnpaid: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  textPaid: {
    color: "#16A34A",
  },
  textPartial: {
    color: "#A16207",
  },
  textUnpaid: {
    color: "#DC2626",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
  },
  val: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 2,
  },
  dueDate: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 12,
    textAlign: "right",
  },
  metaText: {
    fontSize: 12,
    color: "#334155",
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    marginTop: 40,
  },
});
