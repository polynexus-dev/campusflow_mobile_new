import { ConductorScreen, StudentBusScreen } from "@/features/bus";
import { useAuthStore } from "@store/authStore";

export default function BusTrackingRoute() {
  const user = useAuthStore((state) => state.user);

  // Support staff / Faculty driver roles get Conductor Screen
  if (user?.role === "Support Staff" || user?.role === "staff") {
    return <ConductorScreen />;
  }

  return <StudentBusScreen />;
}
