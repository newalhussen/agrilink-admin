/**
 * Gregorian -> Ethiopian calendar. Ethiopia's civil calendar has 12 months of 30 days plus Pagume (5 or 6 days)
 * and runs 7-8 years behind the Gregorian one. The Operations header shows both dates, as in the design.
 */
export const ETHIOPIAN_MONTHS = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
] as const;

const ETHIOPIC_EPOCH_JDN = 1723856;

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export interface EthiopianDate {
  year: number;
  month: number; // 1..13
  day: number;
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const r = (jdn - ETHIOPIC_EPOCH_JDN) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - ETHIOPIC_EPOCH_JDN) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

/** e.g. "መስከረም 29, 2019" */
export function formatEthiopian(date: Date): string {
  const e = toEthiopian(date);
  return `${ETHIOPIAN_MONTHS[e.month - 1]} ${e.day}, ${e.year}`;
}
