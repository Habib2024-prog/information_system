import { getPhoneNumberError, normalizePhoneNumber, phoneNumberErrorMessage } from "./phone";

// Keep this module as a compatibility boundary for school-specific consumers.
export const schoolPhoneErrorMessage = phoneNumberErrorMessage;

export function normalizeSchoolPhone(value: string | null | undefined): string | null {
  return normalizePhoneNumber(value);
}

export function getSchoolPhoneError(value: string | null | undefined): string | undefined {
  return getPhoneNumberError(value, true);
}
