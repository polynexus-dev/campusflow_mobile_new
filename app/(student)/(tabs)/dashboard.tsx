import React from "react";
import { StudentDashboardScreen, LecturerDashboardScreen, SupportStaffDashboardScreen } from "@/features/dashboard";
import { useAuthStore } from "@store/authStore";

// Teaching + admin roles share the lecturer dashboard (it already has the
// HOD/Admin extras behind its own isHodOrAdmin check).
const LECTURER_DASHBOARD_ROLES = [
  "Faculty",
  "teaching_staff",
  "Department Head",
  "Principal",
  "Management",
  "Administrator",
  "SaaS Admin",
];

export default function DashboardRoute() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  if (role && LECTURER_DASHBOARD_ROLES.includes(role)) {
    return <LecturerDashboardScreen />;
  }

  // Only real students get the student dashboard — any other staff role
  // (Librarian, Hostel Warden, Fee Counter, ...) would otherwise hit
  // student-only APIs like the attendance summary.
  if (role?.toLowerCase() === "student") {
    return <StudentDashboardScreen />;
  }

  return <SupportStaffDashboardScreen />;
}
