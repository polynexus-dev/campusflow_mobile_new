import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { attendanceApi } from "../api/attendanceApi";
import { CameraCapture } from "../components/CameraCapture";
import { ROUTES } from "@/constants/route";
import { CameraView, useCameraPermissions } from "expo-camera";

type Lecture = {
  id: number;
  name: string;
  subject: string;
  classroom_name?: string;
  start_time: string;
  end_time: string;
  teacher_name?: string;
  code?: string;
};

type LivenessChallenge = {
  challenge_id: string;
  challenge_type: "blink" | "nod" | "turn_left" | "turn_right";
};

type VerificationResult = {
  success: boolean;
  is_verified: boolean;
  confidence_score: number;
  liveness_passed: boolean;
  message: string;
};

export const MarkAttendanceScreen: React.FC = () => {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<number>>(new Set());
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // QR Fallback scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [verifyingMode, setVerifyingMode] = useState<"face" | "qr" | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Manual request override states
  const [manualRequestStatus, setManualRequestStatus] = useState<{
    has_request: boolean;
    status: "pending" | "approved" | "rejected" | null;
    reason?: string;
  } | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestReason, setRequestReason] = useState("");

  // ── Fetch lectures + today's attendance in parallel ────────────────────
  const fetchLectures = useCallback(async () => {
    try {
      const [lectureRes, historyRes] = await Promise.all([
        attendanceApi.getLectures(),
        attendanceApi.getHistory(),
      ]);

      // Handle both direct list and paginated structures
      const lectureData = lectureRes.results || lectureRes;
      const rawLectures = Array.isArray(lectureData) ? lectureData : [];
      
      // Filter to show only today's lectures
      const todayDate = new Date();
      const todayLectures = rawLectures.filter((l: any) => {
        if (!l.start_time) return false;
        const start = new Date(l.start_time);
        return (
          start.getDate() === todayDate.getDate() &&
          start.getMonth() === todayDate.getMonth() &&
          start.getFullYear() === todayDate.getFullYear()
        );
      });

      setLectures(todayLectures);

      const historyData = historyRes.results || historyRes;
      const ids = new Set<number>(
        (Array.isArray(historyData) ? historyData : [])
          .filter((log: any) => log.is_verified)
          .map((log: any) => log.lecture)
      );
      setAttendedIds(ids);
    } catch (error) {
      console.error("Failed to fetch lectures:", error);
      Alert.alert("Error", "Failed to load lectures. Pull down to refresh.");
    } finally {
      setIsLoadingLectures(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  // QR Scanning sweep laser animation loop
  useEffect(() => {
    if (showScanner) {
      laserAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
    }
  }, [showScanner]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLectures();
  };

  // ── Open camera: fetch a liveness challenge first ─────────────────────
  const handleOpenCamera = async () => {
    if (!selectedLecture) return;
    try {
      setVerifyingMode("face");
      const res = await attendanceApi.getLivenessChallenge();
      setChallenge(res);   // { challenge_id, challenge_type }
      setShowCamera(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not start liveness check. Please try again.");
    }
  };

  // ── Open QR Code Scanner ───────────────────────────────────────────────
  const handleOpenScanner = async () => {
    if (!selectedLecture) return;
    if (!permission) {
      Alert.alert("Error", "Camera driver not loaded yet. Please try again.");
      return;
    }
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Permission Required", "Camera permission is required to scan the proximity QR code.");
        return;
      }
    }
    setShowScanner(true);
  };

  // ── Barcode scan handler ───────────────────────────────────────────────
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isVerifying || !selectedLecture) return;

    // Stop scanning immediately and set states
    setShowScanner(false);
    setVerifyingMode("qr");
    setIsVerifying(true);

    try {
      const parsed = JSON.parse(data);
      if (!parsed.lecture_id || !parsed.token) {
        throw new Error("Invalid QR code format. Please scan a valid CampusFlow dynamic QR code.");
      }

      if (parsed.lecture_id !== selectedLecture.id) {
        throw new Error("This QR code is for a different class session.");
      }

      const response = await attendanceApi.studentVerifyQRAttendance(parsed.lecture_id, parsed.token);

      setVerificationResult({
        success: true,
        is_verified: response.is_verified ?? true,
        confidence_score: 1.0,
        liveness_passed: true,
        message: response.message || "Proximity QR verified successfully! Attendance marked.",
      });
      setAttendedIds((prev) => new Set([...prev, selectedLecture.id]));
    } catch (error: any) {
      console.error("QR Code verification failed:", error);
      let errorMsg = error.message || "Failed to verify QR Code. Please make sure the code is current and active.";
      if (error.data?.error) {
        errorMsg = error.data.error;
      }
      setVerificationResult({
        success: false,
        is_verified: false,
        confidence_score: 0,
        liveness_passed: false,
        message: errorMsg,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Photo capture handler ──────────────────────────────────────────────
  const handleCapture = async (uri: string, prevUri?: string) => {
    if (!selectedLecture || !challenge) return;
    setShowCamera(false);
    setIsVerifying(true);

    try {
      const formData = new FormData();
      formData.append("lecture_id", selectedLecture.id.toString());
      formData.append("photo", { uri, type: "image/jpeg", name: "live_selfie.jpg" } as any);
      if (prevUri) {
        formData.append("photo_prev", { uri: prevUri, type: "image/jpeg", name: "baseline_frame.jpg" } as any);
      }
      formData.append("challenge_id", challenge.challenge_id);

      const response = await attendanceApi.markAttendance(formData);

      const result = { success: true, ...response };
      setVerificationResult(result);
      if (result.is_verified) {
        setAttendedIds((prev) => new Set([...prev, selectedLecture.id]));
      }
    } catch (error: any) {
      // 409 Conflict: Attendance already recorded
      if (error.status === 409 || error.data?.status === 409) {
        setVerificationResult({
          success: true,
          is_verified: true,
          confidence_score: 1.0,
          liveness_passed: true,
          message: "Attendance already marked for this lecture.",
        });
        setAttendedIds((prev) => new Set([...prev, selectedLecture.id]));
      } else {
        setVerificationResult({
          success: false,
          is_verified: false,
          confidence_score: error.data?.confidence_score || error.confidence_score || 0,
          liveness_passed: error.data?.liveness_passed ?? error.liveness_passed ?? false,
          message: error.message || error.data?.error || "Verification failed. Please try again.",
        });
      }
    } finally {
      setIsVerifying(false);
      setChallenge(null);
    }
  };

  // ── Reset for another attempt ──────────────────────────────────────────
  const handleReset = () => {
    setVerificationResult(null);
    setSelectedLecture(null);
    setVerifyingMode(null);
    setManualRequestStatus(null);
    setRequestReason("");
    setRequestModalVisible(false);
    setShowCamera(false);
    setChallenge(null);
    fetchLectures();
  };

  // ── Submit Manual Attendance Request ────────────────────────────────────
  const handleSubmitManualRequest = async () => {
    if (!selectedLecture) return;
    if (!requestReason.trim()) {
      Alert.alert("Reason Required", "Please enter a reason for your request.");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const res = await attendanceApi.studentRequestManualAttendance(
        selectedLecture.id,
        requestReason.trim()
      );
      Alert.alert("Request Submitted", res.message || "Manual attendance request submitted.");
      setRequestModalVisible(false);
      
      // Update status instantly
      const statusRes = await attendanceApi.getStudentManualRequestStatus(selectedLecture.id);
      setManualRequestStatus(statusRes);
    } catch (err: any) {
      console.error("Submit manual request failed:", err);
      Alert.alert("Submission Failed", err.message || err.data?.error || "Could not submit manual request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  // ── Render: Camera Scanner ─────────────────────────────────────────────
  if (showScanner) {
    const translateY = laserAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 250],
    });

    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        
        {/* Semi-transparent overlay with a transparent hole for the scanner */}
        <View style={styles.overlayContainer}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddleRow}>
            <View style={styles.overlaySide} />
            <View style={styles.scannerCutout}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Animated laser line */}
              <Animated.View
                style={[
                  styles.laserLine,
                  { transform: [{ translateY }] }
                ]}
              />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* Text guidance and Cancel button */}
        <View style={styles.scannerControls}>
          <Text style={styles.scannerText}>
            Align the rotating QR code on the lecturer's screen within the box to check in
          </Text>
          <TouchableOpacity
            style={styles.cancelScannerBtn}
            onPress={() => setShowScanner(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelScannerBtnText}>✕ Close Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render: Camera ─────────────────────────────────────────────────────
  if (showCamera && challenge) {
    return (
      <View style={styles.container}>
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setShowCamera(false)}
          guideText="Take a clear selfie for attendance"
          angleGuide="front"
          motionCapture={true}
          challenge={challenge}
        />
      </View>
    );
  }

  // ── Render: Verifying ──────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.verifyingText}>
          {verifyingMode === "qr" ? "Verifying Token..." : "Verifying your identity..."}
        </Text>
        <Text style={styles.verifyingSubtext}>
          {verifyingMode === "qr"
            ? "Validating proximity QR fallback token"
            : "Running face match & liveness check"}
        </Text>
      </View>
    );
  }

  // ── Render: Result ─────────────────────────────────────────────────────
  if (verificationResult) {
    const isSuccess = verificationResult.is_verified;
    return (
      <View style={styles.centeredContainer}>
        <View
          style={[
            styles.resultCard,
            isSuccess ? styles.resultSuccess : styles.resultFailure,
          ]}
        >
          <Text style={styles.resultIcon}>{isSuccess ? "✅" : "❌"}</Text>
          <Text style={styles.resultTitle}>
            {isSuccess ? "Attendance Verified!" : "Verification Failed"}
          </Text>
          <Text style={styles.resultMessage}>
            {verificationResult.message}
          </Text>

          {/* Score details */}
          <View style={styles.scoreContainer}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Confidence</Text>
              <Text style={styles.scoreValue}>
                {((verificationResult.confidence_score || 0) * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Liveness</Text>
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color: verificationResult.liveness_passed
                      ? COLORS.success
                      : COLORS.error,
                  },
                ]}
              >
                {verificationResult.liveness_passed ? "Passed" : "Failed"}
              </Text>
            </View>
          </View>
        </View>

        {!isSuccess && (
          <TouchableOpacity
            style={[styles.warningBtn, { marginBottom: 14 }]}
            onPress={() => setRequestModalVisible(true)}
          >
            <Text style={styles.warningBtnText}>⚠️ Request Manual Attendance</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={handleReset}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: Lecture Selection ──────────────────────────────────────────
  return (
    <>
      <ScrollView
      style={styles.rootContainer}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <Text style={styles.headerSubtitle}>
          Select your active lecture, then perform the biometric liveness selfie check to verify.
        </Text>
      </View>

      {/* Loading */}
      {isLoadingLectures && (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 40 }}
        />
      )}

      {/* No lectures */}
      {!isLoadingLectures && lectures.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No active lectures right now.</Text>
          <Text style={styles.emptySubtext}>
            Pull down to refresh, or wait for your teacher to open attendance.
          </Text>
        </View>
      )}

      {/* Lecture list */}
      {!isLoadingLectures &&
        lectures.map((lecture) => {
          const isAttended = attendedIds.has(lecture.id);
          const isSelected = selectedLecture?.id === lecture.id;
          return (
            <TouchableOpacity
              key={lecture.id}
              style={[
                styles.lectureCard,
                isAttended && styles.lectureCardAttended,
                !isAttended && isSelected && styles.lectureCardSelected,
              ]}
              onPress={async () => {
                if (!isAttended) {
                  setSelectedLecture(lecture);
                  setManualRequestStatus(null);
                  try {
                    const statusRes = await attendanceApi.getStudentManualRequestStatus(lecture.id);
                    setManualRequestStatus(statusRes);
                  } catch (err) {
                    console.error("Failed to load request status:", err);
                  }
                }
              }}
              activeOpacity={isAttended ? 1 : 0.7}
            >
              <View style={styles.lectureHeader}>
                <Text style={styles.lectureCode}>
                  {lecture.classroom_name || "Room"} {lecture.code ? `• Code: ${lecture.code}` : ""}
                </Text>
                {isAttended ? (
                  <View style={styles.attendedBadge}>
                    <Text style={styles.attendedBadgeText}>✓ Attended</Text>
                  </View>
                ) : isSelected ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.lectureName, isAttended && styles.lectureNameAttended]}>
                {lecture.name}
              </Text>
              {lecture.subject && (
                <Text style={styles.lectureSubject}>{lecture.subject}</Text>
              )}
              <Text style={styles.lectureTime}>
                🕐 {formatTime(lecture.start_time)} — {formatTime(lecture.end_time)}
              </Text>
              {lecture.teacher_name && (
                <Text style={styles.lectureTeacher}>
                  👤 {lecture.teacher_name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

      {/* Selected Lecture Action Panel */}
      {selectedLecture && !attendedIds.has(selectedLecture.id) && (
        <View style={styles.actionPanel}>
          <Text style={styles.actionPanelTitle}>Verification Options</Text>
          
          {manualRequestStatus?.has_request && (
            <View style={[
              styles.requestStatusCard,
              manualRequestStatus.status === "approved" && styles.requestStatusApproved,
              manualRequestStatus.status === "rejected" && styles.requestStatusRejected,
              manualRequestStatus.status === "pending" && styles.requestStatusPending,
            ]}>
              <Text style={[
                styles.requestStatusTitle,
                manualRequestStatus.status === "approved" && styles.statusTextApproved,
                manualRequestStatus.status === "rejected" && styles.statusTextRejected,
                manualRequestStatus.status === "pending" && styles.statusTextPending,
              ]}>
                {manualRequestStatus.status === "approved" && "✓ Request Approved"}
                {manualRequestStatus.status === "rejected" && "✕ Request Rejected"}
                {manualRequestStatus.status === "pending" && "⏳ Request Pending Review"}
              </Text>
              {manualRequestStatus.reason && (
                <Text style={styles.requestStatusReason}>
                  Reason: "{manualRequestStatus.reason}"
                </Text>
              )}
              {manualRequestStatus.status === "pending" && (
                <Text style={styles.requestStatusSub}>
                  Your lecturer will review your request shortly. Keep checking here.
                </Text>
              )}
              {manualRequestStatus.status === "approved" && (
                <Text style={styles.requestStatusSub}>
                  Your attendance has been marked present.
                </Text>
              )}
            </View>
          )}

          {/* Show marking button if no pending or approved request */}
          {manualRequestStatus?.status !== "pending" && manualRequestStatus?.status !== "approved" && (
            <>
              <TouchableOpacity
                style={styles.captureBtn}
                onPress={handleOpenCamera}
                activeOpacity={0.8}
              >
                <Text style={styles.captureBtnText}>
                  📸 Take Attendance Selfie
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrScanBtn}
                onPress={handleOpenScanner}
                activeOpacity={0.8}
              >
                <Text style={styles.qrScanBtnText}>
                  📱 Scan Proximity QR Code
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Manual Request trigger if no pending or approved request */}
          {manualRequestStatus?.status !== "pending" && manualRequestStatus?.status !== "approved" && (
            <TouchableOpacity
              style={styles.manualRequestLink}
              onPress={() => setRequestModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.manualRequestLinkText}>
                ⚠️ Can't mark? Submit manual attendance request
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>

    {/* Request Modal */}
    <Modal visible={requestModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Manual Attendance</Text>
            <TouchableOpacity
              onPress={() => setRequestModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Lecture: {selectedLecture?.name}
          </Text>
          <Text style={styles.modalInstruction}>
            Please explain why you are requesting a manual attendance override (e.g. liveness failed, camera lighting, device geofence issue):
          </Text>

          <TextInput
            style={styles.reasonInput}
            multiline={true}
            numberOfLines={4}
            placeholder="Enter your reason here..."
            placeholderTextColor={COLORS.textMuted}
            value={requestReason}
            onChangeText={setRequestReason}
          />

          <TouchableOpacity
            style={[styles.submitRequestBtn, isSubmittingRequest && styles.btnDisabled]}
            onPress={handleSubmitManualRequest}
            disabled={isSubmittingRequest}
          >
            {isSubmittingRequest ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitRequestBtnText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  // Lecture cards
  lectureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  lectureCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.05)",
  },
  lectureCardAttended: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  lectureNameAttended: {
    color: COLORS.success,
  },
  attendedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  attendedBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  lectureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  lectureCode: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  selectedBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  lectureName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  lectureSubject: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  lectureTime: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  lectureTeacher: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  // Take selfie button
  captureBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  captureBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  // Centered container (verifying / result)
  centeredContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  verifyingText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
  },
  verifyingSubtext: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 8,
  },

  // Result card
  resultCard: {
    width: "100%",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  resultSuccess: {
    backgroundColor: "#052E16",
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  resultFailure: {
    backgroundColor: "#450A0A",
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  resultIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  resultTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultMessage: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  // Score display
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  scoreItem: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scoreLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  scoreValue: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#334155",
  },

  // Buttons
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  warningBtn: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  warningBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  
  // Selected lecture action panel
  actionPanel: {
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  actionPanelTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  manualRequestLink: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.3)",
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  manualRequestLinkText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: "700",
  },

  // Manual request status cards
  requestStatusCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  requestStatusPending: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  requestStatusApproved: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  requestStatusRejected: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  requestStatusTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  statusTextPending: {
    color: COLORS.warning,
  },
  statusTextApproved: {
    color: COLORS.success,
  },
  statusTextRejected: {
    color: COLORS.error,
  },
  requestStatusReason: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginBottom: 6,
  },
  requestStatusSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // Modal styles
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "50%",
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
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
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
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },
  modalInstruction: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  reasonInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    height: 100,
    color: COLORS.text,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  submitRequestBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  submitRequestBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  
  // QR scanner styles
  qrScanBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  qrScanBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  overlayMiddleRow: {
    flexDirection: "row",
    height: 260,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  scannerCutout: {
    width: 260,
    height: 260,
    backgroundColor: "transparent",
    position: "relative",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: COLORS.secondary,
    borderWidth: 0,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  laserLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  scannerControls: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  scannerText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  cancelScannerBtn: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  cancelScannerBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default MarkAttendanceScreen;
