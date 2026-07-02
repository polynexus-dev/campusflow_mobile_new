import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@store/authStore";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { COLORS } from "@/shared/theme/colors";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    // 1. Load persisted token/user values
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAppGroup = segments[0] === "(student)";

    if (!isAuthenticated && inAppGroup) {
      // Redirect to login if accessing app route while unauthenticated
      router.replace("/(auth)/login");
    } else if (isAuthenticated && !inAppGroup) {
      // Redirect to dashboard if logged in and accessing auth route
      router.replace("/(student)/(tabs)/dashboard");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(student)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
