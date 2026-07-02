import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Custom hook that calculates the correct bottom padding for scrollable screen content
 * to ensure that items can scroll past the bottom tab bar and remain fully visible.
 * Since this project uses bottom tabs, we default hasTabs to true.
 * 
 * @param extraPadding Additional spacing to apply at the bottom of the content container (defaults to 16)
 * @param hasTabs Whether to include bottom tab bar height (defaults to true)
 * @returns The computed paddingBottom value
 */
export function useBottomTabPadding(extraPadding = 16, hasTabs = true) {
  const insets = useSafeAreaInsets();
  const isNative = Platform.OS === "ios" || Platform.OS === "android";
  const tabHeight = hasTabs ? (Platform.OS === "ios" ? 49 : 60) : 0;
  
  return isNative ? insets.bottom + tabHeight + extraPadding : extraPadding;
}
