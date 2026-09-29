export const phoneNumberErrorMessage = "شماره تماس باید دقیقاً ۱۰ رقم باشد.";

const digitMap: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** Convert common Persian/Arabic digits without accepting any other format. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit]);
}

/** Return the canonical ASCII representation; optional empty fields become null. */
export function normalizePhoneNumber(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = normalizePhoneDigits(value.trim());
  return normalized || null;
}

export function getPhoneNumberError(value: string | null | undefined, optional = false): string | undefined {
  const normalized = normalizePhoneNumber(value);
  if (normalized === null) return optional ? undefined : phoneNumberErrorMessage;
  return /^[0-9]{10}$/.test(normalized) ? undefined : phoneNumberErrorMessage;
}
