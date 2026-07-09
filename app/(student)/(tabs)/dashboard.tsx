import React from "react";
import { StudentDashboardScreen, LecturerDashboardScreen, SupportStaffDashboardScreen } from "@/features/dashboard";
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

  if (user?.role === "Support Staff" || user?.role === "staff") {
    return <SupportStaffDashboardScreen />;
  }

  return <StudentDashboardScreen />;
}
