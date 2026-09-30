import { useCallback, useEffect, useState } from "react";

import { getDashboardRecentActivities, getDashboardSummary, type DashboardSummary } from "../api/dashboard";
import { subscribeDashboardInvalidation } from "../lib/dashboardRefresh";
import type { AuditLog } from "../types/audit";

export function useDashboardMetrics() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const unsubscribe = subscribeDashboardInvalidation(reload);
    window.addEventListener("focus", reload);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", reload);
    };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    setSummary(null); setIsLoading(true); setHasError(false);
    void getDashboardSummary().then((data) => {
      if (!cancelled) setSummary(data);
    }).catch(() => {
      if (!cancelled) setHasError(true);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [revision]);

  return { summary, isLoading, hasError, reload };
}

export function useDashboardActivities(enabled: boolean) {
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [hasError, setHasError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribeDashboardInvalidation(reload);
    window.addEventListener("focus", reload);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", reload);
    };
  }, [enabled, reload]);

  useEffect(() => {
    let cancelled = false;
    setActivities([]); setHasError(false); setIsLoading(enabled);
    if (!enabled) return;
    void getDashboardRecentActivities().then((data) => {
      if (!cancelled) setActivities(data);
    }).catch(() => {
      if (!cancelled) setHasError(true);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [enabled, revision]);

  return { activities, isLoading, hasError, reload };
}
