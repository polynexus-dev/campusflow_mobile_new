/** @type {import('tailwindcss').Config} */
module.exports = {
  // Specify paths to all component files to scan for classes
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#4a154b",
        primaryDark: "#350d35",
        secondary: "#7C3085",
        accent: "#611f69",
        background: "#f4f5f7",
        surface: "#ffffff",
        border: "#e2e8f0",
        textMain: "#1f2937",
        textSecondary: "#64748b",
        textMuted: "#94a3b8",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#dc2626",
        info: "#3B82F6",
      }
    },
  },
  plugins: [],
}
