import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@store/authStore";
import { ActivityIndicator, View, StyleSheet, LogBox } from "react-native";
import { COLORS } from "@/shared/theme/colors";
import { StatusBar } from "expo-status-bar";
import { hasBusConductorAccess } from "@/utils/busAccess";

// Suppress third-party SafeAreaView deprecation warnings
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

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

    const inAppGroup = segments[0] === "(student)" || segments[0] === "(driver)";
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
        // Enforce strict role-based route separation
        const isDriver = hasBusConductorAccess(user);
        if (isDriver) {
          if (segments[0] !== "(driver)" && segments[0] !== "(consent)") {
            router.replace("/(driver)/(tabs)/dashboard");
          }
        } else {
          if (segments[0] !== "(student)" && segments[0] !== "(consent)") {
            router.replace("/(student)/(tabs)/dashboard");
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user, user?.consent_given]);

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
      <Stack.Screen name="(driver)" />
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
