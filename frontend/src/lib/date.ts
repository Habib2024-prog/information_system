/**
 * Keeps API calendar dates stable in RTL table cells without allowing browser
 * timezone conversion to move a date to a neighbouring day.
 */
export function formatApiDate(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? value;
}
