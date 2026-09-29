import { StyleSheet } from "react-native";
import { COLORS } from "@/shared/theme/colors";

// Shared look for simple list screens (cards, segmented tabs, status badges),
// matching LibraryScreen so the newer screens don't each redefine it.
export const listStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 24 },
  tabContainer: { flexDirection: "row", padding: 16, paddingBottom: 8, gap: 12 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#E2E8F0", alignItems: "center" },
  activeTabButton: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "bold", color: "#475569" },
  activeTabText: { color: "#FFFFFF" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  title: { fontSize: 15, fontWeight: "bold", color: "#0F172A", flex: 1 },
  meta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  badgeGreen: { backgroundColor: "#DCFCE7" },
  textGreen: { color: "#16A34A" },
  badgeRed: { backgroundColor: "#FEE2E2" },
  textRed: { color: "#DC2626" },
  badgeAmber: { backgroundColor: "#FEF3C7" },
  textAmber: { color: "#B45309" },
  badgeGray: { backgroundColor: "#F1F5F9" },
  textGray: { color: "#475569" },
  emptyText: { textAlign: "center", color: "#64748B", fontSize: 13, marginTop: 40 },
  errorText: { textAlign: "center", color: "#DC2626", fontSize: 13, marginTop: 40, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#0F172A", marginTop: 8, marginBottom: 4 },
  statRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  statLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#0F172A", marginTop: 4 },
});

export type BadgeTone = "green" | "red" | "amber" | "gray";

export const badgeStyle = (tone: BadgeTone) => ({
  container: [listStyles.badge, tone === "green" ? listStyles.badgeGreen : tone === "red" ? listStyles.badgeRed : tone === "amber" ? listStyles.badgeAmber : listStyles.badgeGray],
  text: [listStyles.badgeText, tone === "green" ? listStyles.textGreen : tone === "red" ? listStyles.textRed : tone === "amber" ? listStyles.textAmber : listStyles.textGray],
});

// Pull the most useful message out of an ApiError (see errors/ApiError.ts) or anything else.
export const errorMessage = (err: unknown, fallback: string): string =>
  (err as { message?: string })?.message || fallback;
