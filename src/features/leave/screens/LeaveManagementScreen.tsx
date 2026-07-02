import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { leaveApi } from "../api/leaveApi";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";

export const LeaveManagementScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.student_profile !== undefined;
  const isFacultyOrAbove = user?.role !== "Student";
  const canApproveLeave =
    user?.role === "Department Head" ||
    user?.role === "Management" ||
    user?.role === "Administrator" ||
    user?.role === "SaaS Admin";

  // Data States
  const [balances, setBalances] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"status" | "apply" | "approve">("status");

  // Form States
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balanceData, myLeavesData, typesData] = await Promise.all([
        leaveApi.getLeaveBalances().catch(() => []),
        leaveApi.getMyLeaves().catch(() => []),
        leaveApi.getLeaveTypes().catch(() => []),
      ]);

      setBalances(balanceData);
      setMyLeaves(myLeavesData);
      setLeaveTypes(typesData);

      if (canApproveLeave) {
        const pendingData = await leaveApi.getPendingRequests().catch(() => []);
        setPendingRequests(pendingData);
      }
    } catch (err: any) {
      console.error("Failed to load leave data:", err);
      Alert.alert("Error Loading Leaves", err.message || "Failed to load leave details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async () => {
    if (!selectedTypeId) {
      Alert.alert("Required Field", "Please select a leave type.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Required Field", "Please enter start and end dates (YYYY-MM-DD).");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Required Field", "Please enter a reason for the leave.");
      return;
    }

    setActionLoading(true);
    try {
      await leaveApi.createLeaveRequest({
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      Alert.alert("Success", "Leave request submitted successfully.");
      setSelectedTypeId(null);
      setStartDate("");
      setEndDate("");
      setReason("");
      setActiveTab("status");
      fetchData();
    } catch (err: any) {
      Alert.alert("Submission Failed", err.message || err.data?.detail || "Could not submit leave request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewRequest = async (requestId: number, action: "approve" | "reject") => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${action} this leave request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action.toUpperCase(),
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await leaveApi.actionLeaveRequest(requestId, action);
              Alert.alert("Success", res.message || `Leave request ${action}d successfully.`);
              fetchData();
            } catch (err: any) {
              Alert.alert("Action Failed", err.message || err.data?.detail || "Failed to complete action.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const selectedTypeLabel = leaveTypes.find((t) => t.id === selectedTypeId)?.name || "Select Leave Type";

  const renderBalanceCard = (item: any) => (
    <View key={item.id || item.leave_type} style={styles.balanceCard}>
      <Text style={styles.balanceTypeName}>{item.leave_type_name || item.leave_type}</Text>
      <View style={styles.balanceStatsRow}>
        <View style={styles.balanceStatItem}>
          <Text style={styles.balanceStatNum}>{item.allocated_days || item.max_days || 0}</Text>
          <Text style={styles.balanceStatLabel}>Max</Text>
        </View>
        <View style={styles.balanceStatDivider} />
        <View style={styles.balanceStatItem}>
          <Text style={styles.balanceStatNum}>{item.used_days || 0}</Text>
          <Text style={styles.balanceStatLabel}>Used</Text>
        </View>
        <View style={styles.balanceStatDivider} />
        <View style={[styles.balanceStatItem, { borderRightWidth: 0 }]}>
          <Text style={[styles.balanceStatNum, { color: COLORS.success }]}>
            {(item.allocated_days || item.max_days || 0) - (item.used_days || 0)}
          </Text>
          <Text style={styles.balanceStatLabel}>Available</Text>
        </View>
      </View>
    </View>
  );

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return { badge: styles.badgeSuccess, text: styles.badgeTextSuccess };
      case "rejected":
        return { badge: styles.badgeDanger, text: styles.badgeTextDanger };
      default:
        return { badge: styles.badgeWarning, text: styles.badgeTextWarning };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace(ROUTES.APP.DASHBOARD)}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Leave Hub</Text>
        <Text style={styles.subtitle}>Manage leave balances and requests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "status" && styles.activeTab]}
          onPress={() => setActiveTab("status")}
        >
          <Text style={[styles.tabText, activeTab === "status" && styles.activeTabText]}>My Leaves</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "apply" && styles.activeTab]}
          onPress={() => setActiveTab("apply")}
        >
          <Text style={[styles.tabText, activeTab === "apply" && styles.activeTabText]}>Apply Leave</Text>
        </TouchableOpacity>
        {canApproveLeave && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "approve" && styles.activeTab]}
            onPress={() => setActiveTab("approve")}
          >
            <Text style={[styles.tabText, activeTab === "approve" && styles.activeTabText]}>
              Approvals ({pendingRequests.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Synchronizing leave profile...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* TAB 1: STATUS & BALANCES */}
          {activeTab === "status" && (
            <View>
              <Text style={styles.sectionTitle}>Leave Balances</Text>
              {balances.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No leave balances allocated.</Text>
                </View>
              ) : (
                <View style={styles.balanceGrid}>{balances.map(renderBalanceCard)}</View>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Request History</Text>
              {myLeaves.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No past leave requests found.</Text>
                </View>
              ) : (
                myLeaves.map((request) => {
                  const statusStyle = getStatusStyle(request.status);
                  return (
                    <View key={request.id} style={styles.historyCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.leaveTypeTag}>
                          {request.leave_type_name || request.leave_type}
                        </Text>
                        <View style={[styles.badge, statusStyle.badge]}>
                          <Text style={[styles.badgeText, statusStyle.text]}>
                            {request.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.dateDuration}>
                        📅 {request.start_date} to {request.end_date}
                      </Text>
                      <Text style={styles.reasonText}>Reason: "{request.reason}"</Text>
                      {request.reviewed_by_name && (
                        <Text style={styles.reviewText}>
                          Reviewed by: {request.reviewed_by_name}
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 2: APPLY LEAVE */}
          {activeTab === "apply" && (
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Leave Type</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setTypeModalVisible(true)}
              >
                <Text style={styles.dropdownText}>{selectedTypeLabel}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>Start Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={startDate}
                onChangeText={setStartDate}
              />

              <Text style={styles.formLabel}>End Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={endDate}
                onChangeText={setEndDate}
              />

              <Text style={styles.formLabel}>Reason</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Explain the reason for leaving..."
                placeholderTextColor={COLORS.textMuted}
                multiline={true}
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
              />

              <TouchableOpacity
                style={[styles.submitButton, actionLoading && styles.btnDisabled]}
                onPress={handleApplyLeave}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Leave Request</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: APPROVALS (HOD/ADMIN ONLY) */}
          {activeTab === "approve" && canApproveLeave && (
            <View>
              <Text style={styles.sectionTitle}>Pending Applications</Text>
              {pendingRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No pending leave requests to review. 🎉</Text>
                </View>
              ) : (
                pendingRequests.map((request) => (
                  <View key={request.id} style={styles.approvalCard}>
                    <View style={styles.approvalHeader}>
                      <View>
                        <Text style={styles.applicantName}>{request.applicant_name}</Text>
                        <Text style={styles.applicantDept}>
                          {request.applicant_role || "Student"} • Dept: {request.applicant_department || "N/A"}
                        </Text>
                      </View>
                      <Text style={styles.leaveTypeTag}>{request.leave_type_name}</Text>
                    </View>

                    <Text style={styles.approvalDuration}>
                      📅 {request.start_date} to {request.end_date}
                    </Text>
                    <Text style={styles.approvalReason}>"{request.reason}"</Text>

                    <View style={styles.approvalActionsRow}>
                      <TouchableOpacity
                        style={[styles.approvalBtn, styles.approveBtn]}
                        onPress={() => handleReviewRequest(request.id, "approve")}
                      >
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.approvalBtn, styles.rejectBtn]}
                        onPress={() => handleReviewRequest(request.id, "reject")}
                      >
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Leave Type Modal */}
      <Modal visible={typeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Leave Type</Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={leaveTypes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedTypeId(item.id);
                    setTypeModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 4,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  emptyCardText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  balanceGrid: {
    gap: 12,
  },
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
  },
  balanceTypeName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  balanceStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceStatItem: {
    flex: 1,
    alignItems: "center",
  },
  balanceStatNum: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  balanceStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  balanceStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  leaveTypeTag: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  badgeDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  badgeWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeTextSuccess: {
    color: COLORS.success,
  },
  badgeTextDanger: {
    color: COLORS.error,
  },
  badgeTextWarning: {
    color: COLORS.warning,
  },
  dateDuration: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  reviewText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: "500",
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.2,
    borderColor: COLORS.border,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  approvalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  approvalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  applicantDept: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  approvalDuration: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  approvalReason: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
    marginBottom: 16,
  },
  approvalActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  approvalBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtn: {
    backgroundColor: "#16A34A",
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  btnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
});

export default LeaveManagementScreen;
