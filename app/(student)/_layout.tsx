import React from "react";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(driver-tabs)" />
      <Stack.Screen name="register-face" />
      <Stack.Screen name="mark-attendance" />
      <Stack.Screen name="attendance-history" />
      <Stack.Screen name="lecturer-history" />
      <Stack.Screen name="assignments/[id]" />
      <Stack.Screen name="bus-tracking" />
      <Stack.Screen name="student-fees" />
      <Stack.Screen name="pay-invoice" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="library" />
      <Stack.Screen name="my-profile" />
    </Stack>
  );
}

