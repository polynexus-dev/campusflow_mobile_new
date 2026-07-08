import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@store/authStore";

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    if (user?.role === "Support Staff" || user?.role === "staff") {
      return <Redirect href="/(student)/bus-tracking" />;
    }
    return <Redirect href="/(student)/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
