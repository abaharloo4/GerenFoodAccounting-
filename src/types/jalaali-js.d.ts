declare module 'jalaali-js' {
  export interface JalaaliDate {
    jy: number;
    jm: number;
    jd: number;
  }
  export function toJalaali(gYear: number, gMonth: number, gDay: number): JalaaliDate;
  export function toGregorian(jYear: number, jMonth: number, jDay: number): { gy: number; gm: number; gd: number };
  export function isValidJalaaliDate(jYear: number, jMonth: number, jDay: number): boolean;
  export function isLeapJalaaliYear(jYear: number): boolean;
  export function jalaaliMonthLength(jYear: number, jMonth: number): number;
}
