import React from "react";
import { Stack } from "expo-router";

export default function ConsentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="consent" />
    </Stack>
  );
}
