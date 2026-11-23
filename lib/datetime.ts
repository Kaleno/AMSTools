const TZ = "Asia/Jakarta";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function wibDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
}

export function parseWibDate(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T00:00:00+07:00`);
}

export function wibDayRange(yyyyMmDd: string) {
  const start = parseWibDate(yyyyMmDd);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function romanMonth(yyyyMmDd: string) {
  const month = Number(yyyyMmDd.slice(5, 7));
  return ROMAN[month - 1] ?? "I";
}

export function yearOf(yyyyMmDd: string) {
  return yyyyMmDd.slice(0, 4);
}

export function dayOf(yyyyMmDd: string) {
  return yyyyMmDd.slice(8, 10);
}

export function formatWibLong(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function toDateInputValue(date: Date) {
  return wibDateString(date);
}

export function wibMonthRange(date = new Date()) {
  const today = wibDateString(date);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const start = parseWibDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = parseWibDate(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`);
  return { start, end };
}

export function addWibDays(yyyyMmDd: string, days: number) {
  const base = parseWibDate(yyyyMmDd);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export function daysDiffWib(from: Date, to: Date) {
  const a = Date.parse(`${wibDateString(from)}T00:00:00+07:00`);
  const b = Date.parse(`${wibDateString(to)}T00:00:00+07:00`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
