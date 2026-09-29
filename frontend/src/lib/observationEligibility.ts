export type ObservationFormKind = "teacher" | "amir";

export const amirObservationJobTitleCodes = ["amir", "manager", "senior_teacher"] as const;

export function getObservationFormKind(jobTitleCode: string): ObservationFormKind | null {
  if (jobTitleCode === "teacher") return "teacher";
  return amirObservationJobTitleCodes.includes(jobTitleCode as (typeof amirObservationJobTitleCodes)[number]) ? "amir" : null;
}

export function canCreateObservation(jobTitleCode: string): boolean {
  return getObservationFormKind(jobTitleCode) !== null;
}
