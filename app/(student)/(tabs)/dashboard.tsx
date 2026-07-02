import React from "react";
import { StudentDashboardScreen, LecturerDashboardScreen } from "@/features/dashboard";
import { useAuthStore } from "@store/authStore";

export default function DashboardRoute() {
  const user = useAuthStore((state) => state.user);

  if (
    user?.role === "Faculty" ||
    user?.role === "teaching_staff" ||
    user?.role === "Department Head"
  ) {
    return <LecturerDashboardScreen />;
  }

  return <StudentDashboardScreen />;
}
