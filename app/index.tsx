import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@store/authStore";
import { hasBusConductorAccess } from "@/utils/busAccess";

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    if (hasBusConductorAccess(user)) {
      return <Redirect href="/(student)/(driver-tabs)/dashboard" />;
    }
    return <Redirect href="/(student)/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
