/**
 * A small, local invalidation channel for dashboard aggregates.  The dashboard
 * has no global query cache, so mutations announce only the data that can
 * affect its bounded summary and activity feeds.
 */
const DASHBOARD_REFRESH_EVENT = "dashboard:refresh";

export function invalidateDashboard(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
}

export function subscribeDashboardInvalidation(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DASHBOARD_REFRESH_EVENT, listener);
  return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, listener);
}
