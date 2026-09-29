import React from "react";
import { Stack } from "expo-router";

export default function GuardianLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="child/[id]" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
