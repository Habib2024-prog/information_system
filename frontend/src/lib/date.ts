import jalaali from "jalaali-js";

type JalaaliDate = { jy: number; jm: number; jd: number };

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    return String(persianIndex >= 0 ? persianIndex : ARABIC_INDIC_DIGITS.indexOf(digit));
  });
}

function pad(value: number): string { return String(value).padStart(2, "0"); }

function formatJalaaliParts({ jy, jm, jd }: JalaaliDate): string {
  return toPersianDigits(`${jy}/${pad(jm)}/${pad(jd)}`);
}

function parseGregorianCalendarDate(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** Formats an ISO/Gregorian calendar date without a timezone day-shift. */
export function formatJalaliDate(value: string | null | undefined): string {
  if (!value) return "—";
  const gregorian = parseGregorianCalendarDate(value);
  if (!gregorian) return "تاریخ نامشخص";
  return formatJalaaliParts(jalaali.toJalaali(gregorian.year, gregorian.month, gregorian.day));
}

/** Formats an ISO instant using the browser's local timezone and Persian/Jalali calendar. */
export function formatJalaliDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "تاریخ نامشخص";
  const parts = new Intl.DateTimeFormat("fa-AF-u-ca-persian-nu-arabext", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}/${parts.month}/${parts.day} - ${parts.hour}:${parts.minute}`;
}

/** Converts a user-entered Jalali date (Persian, Arabic-Indic, or Latin digits) to canonical API ISO date. */
export function jalaliInputToIsoDate(value: string): string | null {
  const normalized = toLatinDigits(value.trim()).replace(/-/g, "/");
  const match = normalized.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const [jy, jm, jd] = match.slice(1).map(Number);
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) return null;
  const gregorian = jalaali.toGregorian(jy, jm, jd);
  return `${gregorian.gy}-${pad(gregorian.gm)}-${pad(gregorian.gd)}`;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Compatibility aliases retained while all callers move to Jalali terminology.
export const formatApiDate = formatJalaliDate;
export const formatApiDateTime = formatJalaliDateTime;
