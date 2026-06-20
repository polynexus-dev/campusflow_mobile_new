import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { attendanceApi } from "../api/attendanceApi";
import { CameraCapture } from "../components/CameraCapture";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ANGLES = ["front", "left", "right"] as const;
type Angle = typeof ANGLES[number];

const ANGLE_LABELS: Record<Angle, string> = {
  front: "Front View",
  left: "Left Profile",
  right: "Right Profile",
};

const ANGLE_INSTRUCTIONS: Record<Angle, string> = {
  front: "Position your face in the oval and look straight at the camera.",
  left: "Turn your head to show your LEFT profile.",
  right: "Turn your head to show your RIGHT profile.",
};

export const FaceRegistrationScreen: React.FC = () => {
  const router = useRouter();
  const updateFaceStatus = useAuthStore((state) => state.updateFaceRegisteredStatus);
  const user = useAuthStore((state) => state.user);
  const isFaceRegistered = user?.student_profile?.is_face_registered ?? false;

  // ── State ──────────────────────────────────────────────────────────────
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<Record<Angle, string | null>>({
    front: null,
    left: null,
    right: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const currentAngle = ANGLES[currentAngleIndex];
  const allCaptured = ANGLES.every((angle) => capturedImages[angle] !== null);

  // ── Capture Handler ────────────────────────────────────────────────────
  const handleCapture = useCallback(
    (uri: string) => {
      setCapturedImages((prev) => {
        const nextImages = { ...prev, [currentAngle]: uri };

        // Find if there is any other angle that is still missing
        const remainingEmptyAngle = ANGLES.find((angle) => nextImages[angle] === null);

        if (remainingEmptyAngle) {
          // Auto-advance to the next missing angle
          const nextIndex = ANGLES.indexOf(remainingEmptyAngle);
          setCurrentAngleIndex(nextIndex);
        } else {
          // All 3 angles are captured, close camera and show review screen
          setShowCamera(false);
        }

        return nextImages;
      });
    },
    [currentAngle]
  );

  // ── Navigation Handlers ────────────────────────────────────────────────
  const handleRetakeAngle = (angle: Angle) => {
    const angleIndex = ANGLES.indexOf(angle);
    setCurrentAngleIndex(angleIndex);
    setCapturedImages((prev) => ({ ...prev, [angle]: null }));
    setShowCamera(true);
  };

  // ── Upload Handler ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!allCaptured) return;

    setIsUploading(true);

    try {
      const formData = new FormData();

      ANGLES.forEach((angle) => {
        const uri = capturedImages[angle];
        if (uri) {
          formData.append(angle, {
            uri,
            type: "image/jpeg",
            name: `${angle}.jpg`,
          } as any);
        }
      });

      const response = await attendanceApi.registerFace(formData);
      updateFaceStatus(true);
      setRegistrationComplete(true);

      Alert.alert(
        "✅ Registration Successful",
        response.message || "All 3 face angles have been stored.",
        [
          {
            text: "Continue",
            onPress: () => router.replace(ROUTES.APP.DASHBOARD),
          },
        ]
      );
    } catch (error: any) {
      // Backend returns validation details for failed angles
      const details = error.data?.details || error.details;
      if (Array.isArray(details) && details.length > 0) {
        const failedDetail = details[0];
        const failedAngle = failedDetail?.angle as Angle;
        const failMsg = failedDetail?.error || "Wrong head position detected.";
        const hint = failedDetail?.hint || `Please retake the '${failedAngle}' photo.`;

        Alert.alert(
          `📸 Retake ${ANGLE_LABELS[failedAngle] || failedAngle} Photo`,
          `${failMsg}\n\n${hint}`,
          [
            {
              text: "Retake Now",
              onPress: () => {
                setIsUploading(false);
                if (failedAngle) {
                  handleRetakeAngle(failedAngle);
                }
              },
            },
          ]
        );
        return;
      }

      // Generic error fallback
      const errorMsg = error.message || error.data?.error || "Registration failed. Please try again.";
      Alert.alert("❌ Registration Failed", errorMsg, [
        { text: "Retry", onPress: () => setIsUploading(false) },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render: Locked if already registered ────────────────────────────────
  if (isFaceRegistered && !registrationComplete) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🔒</Text>
        <Text style={[styles.successTitle, { color: COLORS.primary }]}>Biometrics Locked</Text>
        <Text style={styles.successText}>
          Your face biometrics are already registered and locked. If you need to recapture your face data, please contact your HOD to request a reset.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace(ROUTES.APP.DASHBOARD)}
        >
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: Registration Complete ──────────────────────────────────────
  if (registrationComplete) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Face Registered!</Text>
        <Text style={styles.successText}>
          Your face has been registered successfully. You can now mark attendance using your face.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace(ROUTES.APP.DASHBOARD)}
        >
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: Camera Capture ─────────────────────────────────────────────
  if (showCamera && !allCaptured) {
    return (
      <View style={styles.container}>
        {/* Progress indicator */}
        <View style={styles.progressBar}>
          {ANGLES.map((angle, index) => (
            <View
              key={angle}
              style={[
                styles.progressDot,
                index <= currentAngleIndex && styles.progressDotActive,
                capturedImages[angle] && styles.progressDotDone,
              ]}
            >
              <Text style={styles.progressDotText}>
                {capturedImages[angle] ? "✓" : index + 1}
              </Text>
            </View>
          ))}
        </View>

        {/* Step label */}
        <View style={styles.stepLabel}>
          <Text style={styles.stepText}>
            Step {currentAngleIndex + 1} of 3 — {ANGLE_LABELS[currentAngle]}
          </Text>
        </View>

        {/* Camera */}
        <View style={styles.cameraContainer}>
          <CameraCapture
            onCapture={handleCapture}
            guideText={ANGLE_INSTRUCTIONS[currentAngle]}
            angleGuide={currentAngle}
          />
        </View>
      </View>
    );
  }

  // ── Render: Final Review (all 3 captured) ──────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.reviewContent}
    >
      <Text style={styles.reviewTitle}>Review Your Photos</Text>
      <Text style={styles.reviewSubtitle}>
        Confirm all 3 angles are clear and well-lit before submitting.
      </Text>

      <View style={styles.imageGrid}>
        {ANGLES.map((angle) => (
          <View key={angle} style={styles.imageCard}>
            {capturedImages[angle] && (
              <Image
                source={{ uri: capturedImages[angle]! }}
                style={styles.gridImage}
              />
            )}
            <Text style={styles.imageLabel}>{ANGLE_LABELS[angle]}</Text>
            <TouchableOpacity
              style={styles.retakeSmallBtn}
              onPress={() => handleRetakeAngle(angle)}
            >
              <Text style={styles.retakeSmallBtnText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, isUploading && styles.submitBtnDisabled]}
        onPress={handleUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={styles.submitBtnText}> Processing...</Text>
          </View>
        ) : (
          <Text style={styles.submitBtnText}>🚀 Register My Face</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Progress bar
  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 56,
    paddingBottom: 8,
    gap: 16,
    backgroundColor: COLORS.background,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceDark,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(74, 21, 75, 0.15)",
  },
  progressDotDone: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  progressDotText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  // Step label
  stepLabel: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  stepText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },

  // Camera container
  cameraContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },

  // Review screen
  reviewContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  reviewTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  reviewSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  imageGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  imageCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    alignItems: "center",
  },
  gridImage: {
    width: (SCREEN_WIDTH - 56) / 3,
    height: ((SCREEN_WIDTH - 56) / 3) * 1.33,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  retakeSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceDark,
  },
  retakeSmallBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "600",
  },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Success screen
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    color: COLORS.success,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  successText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
});

export default FaceRegistrationScreen;
