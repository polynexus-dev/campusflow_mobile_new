import { ConductorScreen, StudentBusScreen } from "@/features/bus";
import { useAuthStore } from "@store/authStore";
import { hasBusConductorAccess } from "@/utils/busAccess";

export default function BusTrackingRoute() {
  const user = useAuthStore((state) => state.user);

  // Anyone holding the bus driver/conductor "additional charge" (usually
  // Support Staff, occasionally Faculty) gets the Conductor Screen.
  if (hasBusConductorAccess(user)) {
    return <ConductorScreen />;
  }

  return <StudentBusScreen />;
}
