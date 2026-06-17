export const COLORS = {
  // Brand Colors
  primary: "#0EA5E9",       // Electric Sky Blue
  primaryDark: "#0284C7",
  secondary: "#10B981",     // Emerald Accent
  accent: "#6366F1",        // Violet Highlight
  
  // Neutral Colors
  background: "#0F172A",    // Premium Deep Slate Blue
  surface: "#1E293B",       // Slate Card
  surfaceDark: "#0F172A",
  border: "#334155",        // Soft border lines
  
  // Text Colors
  text: "#F1F5F9",          // White-Slate
  textSecondary: "#94A3B8", // Cool Gray
  textMuted: "#64748B",
  
  // Status Colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Overlays / Highlights
  white: "#FFFFFF",
  transparent: "transparent",
  overlay: "rgba(15, 23, 42, 0.75)",
  glass: "rgba(30, 41, 59, 0.65)",
} as const;

export type ThemeColors = typeof COLORS;
export default COLORS;
