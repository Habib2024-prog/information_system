declare module "jalaali-js" {
  export interface JalaaliDate { jy: number; jm: number; jd: number; }
  export interface GregorianDate { gy: number; gm: number; gd: number; }
  export function toJalaali(year: number, month: number, day: number): JalaaliDate;
  export function toGregorian(year: number, month: number, day: number): GregorianDate;
  export function isValidJalaaliDate(year: number, month: number, day: number): boolean;
  const jalaali: {
    toJalaali: typeof toJalaali;
    toGregorian: typeof toGregorian;
    isValidJalaaliDate: typeof isValidJalaaliDate;
  };
  export default jalaali;
}
