import React, { useState, useRef } from "react";
import { StyleSheet, View, Text, Alert, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { attendanceApi } from "../api/attendanceApi";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@/constants/route";

type AngleStep = "front" | "left" | "right" | "complete";

export const FaceRegistrationScreen: React.FC = () => {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const updateFaceStatus = useAuthStore((state) => state.updateFaceRegisteredStatus);

  const [step, setStep] = useState<AngleStep>("front");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [capturing, setCapturing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const cameraRef = useRef<any>(null);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need camera access to capture your facial biometrics.</Text>
        <Button title="Grant Permission" onPress={requestPermission} style={styles.permissionButton} />
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    try {
      const options = { quality: 0.85, skipProcessing: false };
      const photo = await cameraRef.current.takePictureAsync(options);
      
      if (photo?.uri) {
        const currentStep = step;
        setPhotos((prev) => ({ ...prev, [currentStep]: photo.uri }));

        if (currentStep === "front") {
          setStep("left");
        } else if (currentStep === "left") {
          setStep("right");
        } else if (currentStep === "right") {
          setStep("complete");
        }
      }
    } catch (error) {
      Alert.alert("Capture Error", "Could not take photo. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const handleReset = () => {
    setPhotos({});
    setStep("front");
  };

  const handleRegister = async () => {
    if (!photos.front || !photos.left || !photos.right) {
      Alert.alert("Error", "Please capture all three angles first.");
      return;
    }
    setRegistering(true);

    try {
      const formData = new FormData();
      
      formData.append("front", {
        uri: photos.front,
        name: "front.jpg",
        type: "image/jpeg",
      } as any);

      formData.append("left", {
        uri: photos.left,
        name: "left.jpg",
        type: "image/jpeg",
      } as any);

      formData.append("right", {
        uri: photos.right,
        name: "right.jpg",
        type: "image/jpeg",
      } as any);

      await attendanceApi.registerFace(formData);
      updateFaceStatus(true);

      Alert.alert("Success", "Facial profiles registered successfully!", [
        {
          text: "Go to Dashboard",
          onPress: () => router.replace(ROUTES.APP.DASHBOARD),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Failed to process photos. Make sure face is clear.");
      handleReset();
    } finally {
      setRegistering(false);
    }
  };

  const getStepInstruction = () => {
    switch (step) {
      case "front":
        return "Look directly into the camera (Front Profile)";
      case "left":
        return "Turn your head slowly to the left (Left Profile)";
      case "right":
        return "Turn your head slowly to the right (Right Profile)";
      default:
        return "Review and submit your biometric records";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Biometric Registration</Text>
        <Text style={styles.subtitle}>{getStepInstruction()}</Text>
      </View>

      {step !== "complete" ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} facing="front" style={styles.camera}>
            {/* Outline Guideline Ring */}
            <View style={styles.overlayContainer}>
              <View style={[styles.cutout, step === "left" && styles.cutoutLeft, step === "right" && styles.cutoutRight]} />
            </View>
          </CameraView>
          
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={handleCapture} 
            disabled={capturing}
            style={styles.captureButton}
          >
            {capturing ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <View style={styles.captureInnerButton} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <View style={styles.grid}>
            <View style={styles.previewBox}>
              <Image source={{ uri: photos.front }} style={styles.previewImage} />
              <Text style={styles.previewLabel}>Front</Text>
            </View>
            <View style={styles.previewBox}>
              <Image source={{ uri: photos.left }} style={styles.previewImage} />
              <Text style={styles.previewLabel}>Left Profile</Text>
            </View>
            <View style={styles.previewBox}>
              <Image source={{ uri: photos.right }} style={styles.previewImage} />
              <Text style={styles.previewLabel}>Right Profile</Text>
            </View>
          </View>

          <Button
            title="Register Face Data"
            onPress={handleRegister}
            loading={registering}
            style={styles.actionButton}
          />

          <Button
            title="Recapture Images"
            onPress={handleReset}
            variant="outline"
            disabled={registering}
            style={[styles.actionButton, { marginTop: 12 }] as any}
          />
        </View>
      )}

      {/* Progress dots */}
      <View style={styles.progress}>
        <View style={[styles.dot, photos.front ? styles.dotActive : null]} />
        <View style={[styles.dot, photos.left ? styles.dotActive : null]} />
        <View style={[styles.dot, photos.right ? styles.dotActive : null]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 24,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    maxWidth: 240,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  cameraContainer: {
    flex: 1,
    marginVertical: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  cutout: {
    width: 200,
    height: 280,
    borderRadius: 100,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
  },
  cutoutLeft: {
    borderColor: COLORS.secondary,
    transform: [{ rotate: "15deg" }],
  },
  cutoutRight: {
    borderColor: COLORS.accent,
    transform: [{ rotate: "-15deg" }],
  },
  captureButton: {
    position: "absolute",
    bottom: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  captureInnerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
  },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 24,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 40,
  },
  previewBox: {
    alignItems: "center",
    flex: 1,
  },
  previewImage: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  previewLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  actionButton: {
    width: "100%",
  },
  progress: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
});
export default FaceRegistrationScreen;
