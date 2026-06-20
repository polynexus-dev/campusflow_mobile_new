import React from "react";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="register-face" />
      <Stack.Screen name="mark-attendance" />
      <Stack.Screen name="attendance-history" />
      <Stack.Screen name="lecturer-history" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="assignments/index" />
      <Stack.Screen name="assignments/[id]" />
    </Stack>
  );
}
