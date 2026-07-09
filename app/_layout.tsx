import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@store/authStore";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { COLORS } from "@/shared/theme/colors";
import { StatusBar } from "expo-status-bar";
import { hasBusConductorAccess } from "@/utils/busAccess";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, initializeAuth, user } = useAuthStore();

  useEffect(() => {
    // 1. Load persisted token/user values
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAppGroup = segments[0] === "(student)";
    const inConsentGroup = segments[0] === "(consent)";

    if (!isAuthenticated) {
      // Redirect to login if accessing app route while unauthenticated
      if (inAppGroup || inConsentGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      // User is authenticated
      if (user && user.consent_given === false) {
        // Force to consent notice screen if consent not given
        if (segments[0] !== "(consent)") {
          router.replace("/(consent)/consent");
        }
      } else {
        // Redirect to dashboard if logged in and accessing auth or consent routes
        if (inConsentGroup || !inAppGroup) {
          if (hasBusConductorAccess(user)) {
            router.replace("/(student)/bus-tracking");
          } else {
            router.replace("/(student)/(tabs)/dashboard");
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user?.consent_given]);

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
      <Stack.Screen name="(consent)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
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
