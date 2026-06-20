import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

// ── Normalised landmark positions [x, y] in 0-1 space ────────────────────────
// Arranged to mimic InsightFace 5-pt + typical 25-pt mesh layout.
const PTS: [number, number][] = [
  [0.50, 0.03],  // 0  crown
  [0.33, 0.09],  // 1  forehead-L
  [0.67, 0.09],  // 2  forehead-R
  [0.17, 0.21],  // 3  temple-L
  [0.83, 0.21],  // 4  temple-R
  [0.26, 0.31],  // 5  eye-L-outer
  [0.37, 0.29],  // 6  eye-L-centre
  [0.46, 0.32],  // 7  eye-L-inner
  [0.54, 0.32],  // 8  eye-R-inner
  [0.63, 0.29],  // 9  eye-R-centre
  [0.74, 0.31],  // 10 eye-R-outer
  [0.50, 0.42],  // 11 nose-bridge
  [0.50, 0.53],  // 12 nose-tip
  [0.42, 0.56],  // 13 nose-ala-L
  [0.58, 0.56],  // 14 nose-ala-R
  [0.15, 0.52],  // 15 cheek-L
  [0.85, 0.52],  // 16 cheek-R
  [0.35, 0.67],  // 17 mouth-L
  [0.50, 0.70],  // 18 mouth-C
  [0.65, 0.67],  // 19 mouth-R
  [0.21, 0.76],  // 20 jaw-L
  [0.79, 0.76],  // 21 jaw-R
  [0.35, 0.87],  // 22 chin-L
  [0.50, 0.93],  // 23 chin-C
  [0.65, 0.87],  // 24 chin-R
];

const EDGES: [number, number][] = [
  // forehead
  [0, 1], [0, 2], [1, 3], [2, 4],
  // temples → eyes
  [3, 5], [1, 5], [4, 10], [2, 10],
  // eye line
  [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
  // eyes → nose bridge
  [7, 11], [8, 11],
  // nose
  [11, 12], [12, 13], [12, 14],
  // cheeks
  [3, 15], [5, 15], [4, 16], [10, 16],
  // cheek → mouth
  [15, 17], [16, 19],
  // nose → mouth
  [13, 17], [14, 19],
  // mouth
  [17, 18], [18, 19],
  // mouth → jaw
  [15, 20], [17, 20], [16, 21], [19, 21],
  // jaw → chin
  [20, 22], [21, 24], [22, 23], [23, 24],
  // centre axis
  [0, 11], [12, 18], [18, 23],
];

// ── Thin line drawn as a rotated rectangle ────────────────────────────────────
interface MeshLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const MeshLine: React.FC<MeshLineProps> = ({ x1, y1, x2, y2, color }) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ang = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View
      style={{
        position: "absolute",
        left: (x1 + x2) / 2 - len / 2,
        top: (y1 + y2) / 2 - 0.5,
        width: len,
        height: 1,
        backgroundColor: color,
        opacity: 0.40,
        transform: [{ rotate: `${ang}deg` }],
      }}
    />
  );
};

// ── Main component ────────────────────────────────────────────────────────────
interface FaceMeshOverlayProps {
  width: number;
  height: number;
  phase: "aligning" | "countdown" | "captured";
}

export const FaceMeshOverlay: React.FC<FaceMeshOverlayProps> = ({ width, height, phase }) => {
  const pulse = useRef(new Animated.Value(0.55)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.0, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 1300, useNativeDriver: true }),
      ])
    );
    const scanLoop = Animated.loop(
      Animated.timing(scan, { toValue: 1, duration: 2400, useNativeDriver: true })
    );
    pulseLoop.start();
    scanLoop.start();
    return () => {
      pulseLoop.stop();
      scanLoop.stop();
    };
  }, [pulse, scan]);

  const isCaptured = phase === "captured";
  const dotColor = isCaptured ? "#22C55E" : "#67E8F9";
  const lineColor = isCaptured ? "#22C55E" : "#22D3EE";
  const scanColor = "#67E8F9";
  const DOT_R = 3.5;

  const px = (nx: number) => nx * width;
  const py = (ny: number) => ny * height;

  const scanY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, height + 4],
  });

  return (
    <View
      style={{
        position: "absolute",
        width,
        height,
        top: "50%",
        left: "50%",
        marginTop: -height / 2,
        marginLeft: -width / 2,
        overflow: "hidden",
      }}
      pointerEvents="none"
    >
      {/* ── Connecting lines ── */}
      {EDGES.map(([a, b], i) => (
        <MeshLine
          key={i}
          x1={px(PTS[a][0])}
          y1={py(PTS[a][1])}
          x2={px(PTS[b][0])}
          y2={py(PTS[b][1])}
          color={lineColor}
        />
      ))}

      {/* ── Landmark dots ── */}
      {PTS.map(([nx, ny], i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: px(nx) - DOT_R,
            top: py(ny) - DOT_R,
            width: DOT_R * 2,
            height: DOT_R * 2,
            borderRadius: DOT_R,
            backgroundColor: dotColor,
            opacity: pulse,
            shadowColor: dotColor,
            shadowOpacity: 1,
            shadowRadius: 5,
            elevation: 5,
          }}
        />
      ))}

      {/* ── Horizontal scan line (hidden during blink phase) ── */}
      {!isCaptured && (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: 2,
            backgroundColor: scanColor,
            opacity: 0.60,
            transform: [{ translateY: scanY }],
          }}
        />
      )}
    </View>
  );
};

export default FaceMeshOverlay;
