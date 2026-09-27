/**
 * Keeps API calendar dates stable in RTL table cells without allowing browser
 * timezone conversion to move a date to a neighbouring day.
 */
export function formatApiDate(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? value;
}

/** Audit timestamps include time; display in the browser's local timezone. */
export function formatApiDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "تاریخ نامشخص";
  return new Intl.DateTimeFormat("fa-AF", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", calendar: "gregory" }).format(date);
}
