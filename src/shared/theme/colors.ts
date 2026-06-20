export const COLORS = {
  // Brand Colors
  primary: "#4a154b",       // Slack/CampusFlow Deep Purple (Aubergine)
  primaryDark: "#350d35",   // Darker shade for pressed states
  secondary: "#7C3085",     // Medium orchid-purple
  accent: "#611f69",        // Royal Purple
  
  // Neutral Colors (Premium Light Mode base, matching clean slate UI)
  background: "#f4f5f7",    // Soft off-white / light grey-purple
  surface: "#ffffff",       // Pure White for Cards
  surfaceDark: "#e8eaed",
  border: "#e2e8f0",        // Soft border lines
  
  // Text Colors
  text: "#1f2937",          // Dark Slate / Charcoal for body text
  textSecondary: "#64748b", // Muted Slate Gray for secondary text
  textMuted: "#94a3b8",     // Soft gray for placeholders
  
  // Status Colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#dc2626",         // Red error color from frontend
  info: "#3B82F6",
  
  // Overlays / Highlights
  white: "#FFFFFF",
  transparent: "transparent",
  overlay: "rgba(74, 21, 75, 0.4)", // Translucent purple overlay
  glass: "rgba(255, 255, 255, 0.85)",
} as const;

export type ThemeColors = typeof COLORS;
export default COLORS;

