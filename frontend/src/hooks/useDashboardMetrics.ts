import { useEffect, useState } from "react";

import { getDepartments } from "../api/departments";
import { getEmployees } from "../api/employees";
import { getSchools } from "../api/schools";
import { getScientificMembers } from "../api/scientificMembers";

interface DashboardMetrics {
  employees?: number;
  departments?: number;
  scientificMembers?: number;
  schools?: number;
}

interface DashboardMetricsState {
  metrics: DashboardMetrics;
  isLoading: boolean;
  hasError: boolean;
}

export function useDashboardMetrics(): DashboardMetricsState {
  const [state, setState] = useState<DashboardMetricsState>({
    metrics: {},
    isLoading: true,
    hasError: false,
  });

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getEmployees(), getDepartments(), getScientificMembers(), getSchools()])
      .then(([employees, departments, scientificMembers, schools]) => {
        if (!isMounted) return;
        setState({
          metrics: {
            employees: employees.status === "fulfilled" ? employees.value.total : undefined,
            departments: departments.status === "fulfilled" ? departments.value.length : undefined,
            scientificMembers: scientificMembers.status === "fulfilled" ? scientificMembers.value.total : undefined,
            schools: schools.status === "fulfilled" ? schools.value.total : undefined,
          },
          isLoading: false,
          hasError: [employees, departments, scientificMembers, schools].some((result) => result.status === "rejected"),
        });
      })
      .catch(() => {
        if (isMounted) setState({ metrics: {}, isLoading: false, hasError: true });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
