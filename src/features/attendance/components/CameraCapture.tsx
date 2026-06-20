import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import FaceMeshOverlay from "./FaceMeshOverlay";

const { width: SW } = Dimensions.get("window");
const OVAL_W = SW * 0.58;
const OVAL_H = OVAL_W * 1.32;

// ─── Per-angle config ─────────────────────────────────────────────────────────
interface AngleConfig {
  color: string;
  icon: string;
  label: string;
  sub: string;
  arrow: "left" | "right" | null;
}

const ANGLE: Record<string, AngleConfig> = {
  front: {
    color: "#6366F1",         // indigo
    icon: "👤",
    label: "Look Straight Ahead",
    sub: "Face the camera directly and keep your head still.",
    arrow: null,
  },
  left: {
    color: "#F59E0B",         // amber
    icon: "👈",
    label: "Turn Head LEFT",
    sub: "Slowly turn your head to the LEFT until your right ear is visible.",
    arrow: "left",
  },
  right: {
    color: "#EC4899",         // pink
    icon: "👉",
    label: "Turn Head RIGHT",
    sub: "Slowly turn your head to the RIGHT until your left ear is visible.",
    arrow: "right",
  },
};

const ALIGN_DELAY = 1800;   // ms before countdown starts
const COUNTDOWN_FROM = 3;

// Per-challenge UI config
interface ChallengeUiConfig {
  icon: string;
  label: string;
  sub: string;
  captureMs: number;
}

const CHALLENGE_UI: Record<string, ChallengeUiConfig> = {
  blink: { icon: "👀", label: "Blink Now!", sub: "Blink your eyes once", captureMs: 800 },
  nod: { icon: "⬇️", label: "Nod Down!", sub: "Nod your head downward", captureMs: 5000 },
  turn_left: { icon: "👈", label: "Turn Left!", sub: "Turn your head to the left", captureMs: 5000 },
  turn_right: { icon: "👉", label: "Turn Right!", sub: "Turn your head to the right", captureMs: 5000 },
};

interface CameraCaptureProps {
  onCapture: (uri: string, prevUri?: string) => void;
  onCancel?: () => void;
  angleGuide?: "front" | "left" | "right";
  guideText?: string;
  motionCapture?: boolean;
  challenge?: {
    challenge_id: string;
    challenge_type: "blink" | "nod" | "turn_left" | "turn_right";
  } | null;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  angleGuide = "front",
  guideText,
  motionCapture = false,
  challenge = null,
}) => {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // ── Phase: "aligning" → "countdown" → "captured" ─────────────────────────
  const [phase, setPhase] = useState<"aligning" | "countdown" | "captured">("aligning");
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [dotStates, setDotStates] = useState<boolean[]>([false, false, false, false, false]);
  const [isFlashing, setIsFlashing] = useState(false);
  const [captureSecsLeft, setCaptureSecsLeft] = useState<number | null>(null);

  const countdownRef = useRef<any>(null);
  const alignTimerRef = useRef<any>(null);
  const dotsIntervalRef = useRef<any>(null);
  const captureCountdownRef = useRef<any>(null);

  // ── Animations ───────────────────────────────────────────────────────────
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startArrow = useCallback(() => {
    const cfg = ANGLE[angleGuide];
    if (!cfg || !cfg.arrow) return;
    arrowAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [angleGuide, arrowAnim]);

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    setPhase("captured");
    pulseAnim.stopAnimation();
    arrowAnim.stopAnimation();

    try {
      if (motionCapture) {
        const challengeType = challenge?.challenge_type || "blink";
        const ui = CHALLENGE_UI[challengeType] || CHALLENGE_UI.blink;

        // Frame 1 — baseline
        const frame1 = await cameraRef.current.takePictureAsync({
          quality: 1.0,
          base64: false,
          skipProcessing: false,
        });

        if (challengeType === "blink") {
          // Animate dots while user blinks
          dotsIntervalRef.current = setInterval(() => {
            setDotStates(() => {
              const next = [false, false, false, false, false];
              const count = 2 + Math.floor(Math.random() * 2);
              const indices = [...Array(5).keys()].sort(() => Math.random() - 0.5);
              for (let i = 0; i < count; i++) next[indices[i]] = true;
              return next;
            });
          }, 120);

          await new Promise((resolve) => setTimeout(resolve, ui.captureMs));
          if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current);
          setDotStates([true, true, true, true, true]);

          setIsFlashing(true);
          await new Promise((resolve) => setTimeout(resolve, 350));

          const frame2 = await cameraRef.current.takePictureAsync({
            quality: 1.0,
            base64: false,
            skipProcessing: false,
          });
          setIsFlashing(false);
          if (frame2?.uri && frame1?.uri) {
            onCapture(frame2.uri, frame1.uri);
          }
        } else {
          // Head-motion challenge: show countdown for the action window
          let secsLeft = Math.round(ui.captureMs / 1000);
          setCaptureSecsLeft(secsLeft);
          captureCountdownRef.current = setInterval(() => {
            secsLeft -= 1;
            setCaptureSecsLeft(secsLeft > 0 ? secsLeft : 0);
            if (secsLeft <= 0 && captureCountdownRef.current) {
              clearInterval(captureCountdownRef.current);
            }
          }, 1000);

          await new Promise((resolve) => setTimeout(resolve, ui.captureMs));
          if (captureCountdownRef.current) clearInterval(captureCountdownRef.current);
          setCaptureSecsLeft(null);

          const frame2 = await cameraRef.current.takePictureAsync({
            quality: 1.0,
            base64: false,
            skipProcessing: false,
          });
          if (frame2?.uri && frame1?.uri) {
            onCapture(frame2.uri, frame1.uri);
          }
        }
      } else {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0,
          base64: false,
          skipProcessing: false,
        });
        if (photo?.uri) {
          onCapture(photo.uri);
        }
      }
    } catch (err) {
      console.error("Capture error:", err);
      setIsFlashing(false);
      setCaptureSecsLeft(null);
      resetFlow();
    }
  }, [onCapture, motionCapture, challenge, pulseAnim, arrowAnim]);

  const startCountdown = useCallback(() => {
    let count = COUNTDOWN_FROM;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        capture();
      }
    }, 1000);
  }, [capture]);

  const resetFlow = useCallback(() => {
    // clear timers
    if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current);
    if (captureCountdownRef.current) clearInterval(captureCountdownRef.current);
    
    setDotStates([false, false, false, false, false]);
    setCaptureSecsLeft(null);
    setPhase("aligning");
    setCountdown(COUNTDOWN_FROM);

    // reset animations
    arrowAnim.stopAnimation(); arrowAnim.setValue(0);
    pulseAnim.stopAnimation(); pulseAnim.setValue(1);
    fadeAnim.stopAnimation(); fadeAnim.setValue(0);

    // start arrow bounce
    startArrow();

    // fade in the oval
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();

    // after ALIGN_DELAY, start countdown
    alignTimerRef.current = setTimeout(() => {
      setPhase("countdown");
      startPulse();
      startCountdown();
    }, ALIGN_DELAY);
  }, [arrowAnim, pulseAnim, fadeAnim, startArrow, startPulse, startCountdown]);

  // reset everything when angle changes
  useEffect(() => {
    resetFlow();
    return () => {
      if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current);
      if (captureCountdownRef.current) clearInterval(captureCountdownRef.current);
    };
  }, [angleGuide, resetFlow]);

  // ─── Permission states ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.centered}>
        <Text style={s.permTitle}>📷 Camera Required</Text>
        <Text style={s.permSub}>Allow camera access to capture your face.</Text>
        <Text style={s.permBtn} onPress={requestPermission}>Grant Permission</Text>
      </View>
    );
  }

  // ─── Derived display values ───────────────────────────────────────────────
  const cfg = ANGLE[angleGuide] || ANGLE.front;
  const color = cfg.color;
  const isAligning = phase === "aligning";
  const isCountdown = phase === "countdown";
  const isCaptured = phase === "captured";
  const challengeType = challenge?.challenge_type;
  const challengeConfig = challengeType ? CHALLENGE_UI[challengeType] : undefined;

  // arrow slides left or right
  const arrowTX = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: cfg.arrow === "left" ? [0, -20] : cfg.arrow === "right" ? [0, 20] : [0, 0],
  });

  // oval color: indigo while aligning, theme color when counting, white when done
  const ovalColor = isCaptured ? "#FFFFFF" : isCountdown ? color : "#6366F1";

  return (
    <View style={s.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

      {/* ── Top banner ──────────────────────────────────────────────── */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>{cfg.icon}  {cfg.label}</Text>
        <Text style={s.bannerSub}>{guideText || cfg.sub}</Text>
      </View>

      {onCancel && (
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={s.cancelBtnText}>✕ Close</Text>
        </TouchableOpacity>
      )}

      {/* ── Oval + arrow + countdown ─────────────────────────────────── */}
      <View style={s.ovalArea}>
        {/* Directional arrow */}
        {cfg.arrow && (
          <Animated.Text
            style={[
              s.arrow,
              cfg.arrow === "left" ? s.arrowL : s.arrowR,
              { transform: [{ translateX: arrowTX }] },
            ]}
          >
            {cfg.arrow === "left" ? "←" : "→"}
          </Animated.Text>
        )}

        {/* Face oval */}
        <Animated.View
          style={[
            s.oval,
            {
              borderColor: ovalColor,
              shadowColor: ovalColor,
              opacity: fadeAnim,
              transform: [{ scale: isCountdown ? pulseAnim : 1 }],
              borderStyle: isAligning ? "dashed" : "solid",
            },
          ]}
        />

        {/* Face landmark mesh overlay */}
        <FaceMeshOverlay width={OVAL_W * 0.88} height={OVAL_H * 0.88} phase={phase} />

        {/* Overlay inside oval */}
        <View style={s.ovalInner}>
          {isCaptured ? (
            challengeType !== "blink" ? (
              <View style={s.blinkOverlay}>
                <Text style={s.blinkText}>{challengeConfig?.icon ?? "🎯"}</Text>
                <Text style={s.blinkLabel}>{challengeConfig?.label ?? "Go!"}</Text>
                {captureSecsLeft !== null && (
                  <Text style={s.captureCountdown}>{captureSecsLeft}s</Text>
                )}
              </View>
            ) : (
              <View style={s.blinkOverlay}>
                <Text style={s.blinkText}>👀</Text>
                <Text style={s.blinkLabel}>Blink now!</Text>
                <View style={s.dotsRow}>
                  {dotStates.map((active, i) => (
                    <View key={i} style={[s.dot, active ? s.dotActive : s.dotInactive]} />
                  ))}
                </View>
              </View>
            )
          ) : isCountdown ? (
            <>
              <Text style={[s.countNum, { color }]}>{countdown}</Text>
              <Text style={s.countLabel}>Hold still</Text>
            </>
          ) : (
            <ActivityIndicator size="small" color="#6366F1" />
          )}
        </View>
      </View>

      {/* ── Bottom status ────────────────────────────────────────────── */}
      <View style={s.footer}>
        <View style={[
          s.statusPill,
          isCountdown ? { borderColor: color, backgroundColor: `${color}22` }
            : isCaptured ? { borderColor: "#22C55E", backgroundColor: "#14532D88" }
              : s.statusDefault,
        ]}>
          {isCaptured ? (
            <Text style={s.statusTxt}>
              {challengeType !== "blink"
                ? `${challengeConfig?.icon ?? "🎯"} ${challengeConfig?.sub ?? "Perform the challenge now!"}`
                : <>👁 Checking liveness — <Text style={{ color: "#22C55E", fontWeight: "900" }}>blink once!</Text></>
              }
            </Text>
          ) : isCountdown ? (
            <Text style={s.statusTxt}>
              Auto-capturing in <Text style={{ color, fontWeight: "900" }}>{countdown}s</Text>
              …  Keep your head still.
            </Text>
          ) : (
            <Text style={s.statusTxt}>
              ⏳ Aligning…  Position your face inside the oval.
            </Text>
          )}
        </View>
      </View>

      {isFlashing && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#FFFFFF",
            zIndex: 99999,
          }}
          pointerEvents="none"
        />
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permTitle: { color: "#FFF", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  permSub: { color: "#94A3B8", fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  permBtn: { color: "#6366F1", fontSize: 16, fontWeight: "700" },
  banner: {
    paddingTop: 52,
    paddingHorizontal: 80,
    paddingBottom: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  bannerTitle: {
    color: "#FFF",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  bannerSub: {
    color: "#CBD5E1",
    fontSize: 13,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 19,
  },
  cancelBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 110,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  ovalArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  oval: {
    width: OVAL_W,
    height: OVAL_H,
    borderRadius: OVAL_W / 2,
    borderWidth: 3,
    backgroundColor: "transparent",
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ovalInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  countNum: {
    fontSize: 80,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  countLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  arrow: {
    fontSize: 52,
    position: "absolute",
    zIndex: 10,
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  arrowL: { left: SW * 0.04 },
  arrowR: { right: SW * 0.04 },
  footer: {
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 14,
  },
  statusPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    maxWidth: "100%",
  },
  statusDefault: {
    borderColor: "#334155",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  statusTxt: {
    color: "#F8FAFC",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },
  blinkOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  blinkText: {
    fontSize: 52,
    marginBottom: 4,
  },
  blinkLabel: {
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captureCountdown: {
    color: "#FFF",
    fontSize: 36,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotActive: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

export default CameraCapture;
