export const schoolPhoneErrorMessage = "شماره تماس معتبر نیست.";

export function normalizeSchoolPhone(value: string | null): string | null {
  return value?.trim() || null;
}

export function getSchoolPhoneError(value: string | null): string | undefined {
  const phone = normalizeSchoolPhone(value);
  if (phone === null) return undefined;
  // Match SchoolWrite validation; do not coerce phone numbers to numeric values.
  const digits = "0-9۰-۹٠-٩";
  const group = `(?:[${digits}]+|\\([${digits}]+\\))`;
  const pattern = new RegExp(`^\\+?${group}(?: *(?:[.-] *)?${group})*$`);
  const digitCount = phone.match(new RegExp(`[${digits}]`, "g"))?.length ?? 0;
  return digitCount >= 7 && digitCount <= 15 && pattern.test(phone)
    ? undefined
    : schoolPhoneErrorMessage;
}
