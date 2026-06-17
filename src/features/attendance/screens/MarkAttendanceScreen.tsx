import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Alert, Image, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { COLORS } from "@/shared/theme/colors";
import { Button } from "@/shared/ui/Button";
import { attendanceApi } from "../api/attendanceApi";
import { ROUTES } from "@/constants/route";

type LivenessChallenge = {
  challenge_id: string;
  challenge_type: "blink" | "nod" | "turn_left" | "turn_right";
};

export const MarkAttendanceScreen: React.FC = () => {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [lectures, setLectures] = useState<any[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<any>(null);
  
  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [capturePhase, setCapturePhase] = useState<"select_lecture" | "baseline" | "challenge" | "submitting" | "success">("select_lecture");
  const [photoBaseline, setPhotoBaseline] = useState<string | null>(null);
  const [photoChallenge, setPhotoChallenge] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const cameraRef = useRef<any>(null);

  // Fetch lectures on load
  useEffect(() => {
    const loadLectures = async () => {
      try {
        const list = await attendanceApi.getLectures();
        setLectures(list);
      } catch (err: any) {
        Alert.alert("Error Loading Lectures", err.message || "Failed to load active lectures.");
      }
    };
    loadLectures();
  }, []);

  const handleStartVerification = async (lecture: any) => {
    setSelectedLecture(lecture);
    setCapturePhase("baseline");
    try {
      const activeChallenge = await attendanceApi.getLivenessChallenge();
      setChallenge(activeChallenge);
    } catch (err: any) {
      Alert.alert("Verification Error", "Failed to retrieve liveness parameters. Please try again.");
      setCapturePhase("select_lecture");
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    try {
      const options = { quality: 0.8, skipProcessing: false };
      const photo = await cameraRef.current.takePictureAsync(options);

      if (photo?.uri) {
        if (capturePhase === "baseline") {
          setPhotoBaseline(photo.uri);
          setCapturePhase("challenge");
        } else if (capturePhase === "challenge") {
          setPhotoChallenge(photo.uri);
          handleSubmit(photo.uri);
        }
      }
    } catch (error) {
      Alert.alert("Capture Error", "Could not capture frame. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async (challengeUri: string) => {
    if (!selectedLecture || !challenge || !photoBaseline || !challengeUri) return;
    setCapturePhase("submitting");

    try {
      const formData = new FormData();
      formData.append("lecture_id", selectedLecture.id.toString());
      formData.append("challenge_id", challenge.challenge_id);
      
      formData.append("photo_prev", {
        uri: photoBaseline,
        name: "baseline.jpg",
        type: "image/jpeg",
      } as any);

      formData.append("photo", {
        uri: challengeUri,
        name: "challenge.jpg",
        type: "image/jpeg",
      } as any);

      const res = await attendanceApi.markAttendance(formData);

      if (res.success || res.is_verified) {
        setCapturePhase("success");
      } else {
        throw new Error(res.message || "Verification did not pass security check.");
      }
    } catch (err: any) {
      Alert.alert("Attendance Refused", err.message || "Verification failed. Cosine matching score too low.", [
        {
          text: "Try Again",
          onPress: () => resetFlow(),
        },
      ]);
    }
  };

  const resetFlow = () => {
    setPhotoBaseline(null);
    setPhotoChallenge(null);
    setChallenge(null);
    setCapturePhase("select_lecture");
  };

  const getChallengeDirective = () => {
    if (!challenge) return "Wait...";
    switch (challenge.challenge_type) {
      case "blink":
        return "Blink your eyes strongly now!";
      case "nod":
        return "Nod your head up and down!";
      case "turn_left":
        return "Turn your head to the left profile!";
      case "turn_right":
        return "Turn your head to the right profile!";
    }
  };

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
        <Text style={styles.permissionText}>Camera access is required for liveness and biometric checking.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mark Attendance</Text>
        {capturePhase === "baseline" && <Text style={styles.subtitle}>Step 1: Capture a neutral front-facing selfie</Text>}
        {capturePhase === "challenge" && <Text style={[styles.subtitle, styles.directive]}>{getChallengeDirective()}</Text>}
      </View>

      {capturePhase === "select_lecture" && (
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Select Active Lecture</Text>
          {lectures.length === 0 ? (
            <Text style={styles.emptyText}>No active lectures scheduled at this moment.</Text>
          ) : (
            <FlatList
              data={lectures}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.lectureCard}
                  onPress={() => handleStartVerification(item)}
                >
                  <Text style={styles.lectureName}>{item.name}</Text>
                  <Text style={styles.lectureSubject}>{item.subject}</Text>
                  <Text style={styles.lectureTime}>
                    {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
                    {new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {(capturePhase === "baseline" || capturePhase === "challenge") && (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} facing="front" style={styles.camera}>
            <View style={styles.overlayContainer}>
              <View style={[
                styles.cutout,
                capturePhase === "challenge" && challenge?.challenge_type === "turn_left" && styles.cutoutLeft,
                capturePhase === "challenge" && challenge?.challenge_type === "turn_right" && styles.cutoutRight
              ]} />
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
      )}

      {capturePhase === "submitting" && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.processingText}>Running Anti-Spoofing checks & matching face signatures...</Text>
        </View>
      )}

      {capturePhase === "success" && (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Attendance Verified</Text>
          <Text style={styles.successText}>Your biometrics matched and attendance was recorded successfully.</Text>
          <Button
            title="Return to Dashboard"
            onPress={() => router.replace(ROUTES.APP.DASHBOARD)}
            style={styles.successButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
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
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
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
  directive: {
    color: COLORS.warning,
    fontWeight: "700",
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginVertical: 12,
  },
  lectureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  lectureName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  lectureSubject: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  lectureTime: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 8,
    fontWeight: "600",
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
  cameraContainer: {
    flex: 1,
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
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  processingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 72,
    color: COLORS.success,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  successText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  successButton: {
    width: "100%",
  },
});
export default MarkAttendanceScreen;
