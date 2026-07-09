/**
 * A user reaches the bus Conductor Panel by holding the "additional charge" of
 * driver/conductor on an active BusRoute (backend: BusRoute.driver / .conductor),
 * not by base role alone — drivers/conductors are still ordinary Support Staff
 * (or occasionally Faculty) employees otherwise. `is_bus_driver` / `is_bus_conductor`
 * are computed server-side and returned on login and on GET /user/.
 */
export function hasBusConductorAccess(user: { is_bus_driver?: boolean; is_bus_conductor?: boolean } | null | undefined): boolean {
  return !!(user?.is_bus_driver || user?.is_bus_conductor);
}
