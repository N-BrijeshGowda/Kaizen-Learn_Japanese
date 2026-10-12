// Everyone in Kaizen is on India Standard Time (UTC+5:30, no daylight saving).
// "Today" and "the next day" always mean the IST calendar day (PRD 5.4).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The IST calendar date of an instant, as "YYYY-MM-DD". */
export function istDateString(at: Date = new Date()): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** A "YYYY-MM-DD" IST date as the Date value Prisma expects for @db.Date columns. */
export function dateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function istToday(at: Date = new Date()): Date {
  return dateOnly(istDateString(at));
}

/** Monday (as "YYYY-MM-DD") of the IST calendar week containing the given date string. */
export function istWeekStart(ymd: string): string {
  const d = dateOnly(ymd);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  const d = dateOnly(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Hour of day (0 to 23) in IST, used for the greeting. */
export function istHour(at: Date = new Date()): number {
  return new Date(at.getTime() + IST_OFFSET_MS).getUTCHours();
}

export function greetingFor(at: Date = new Date()): string {
  const h = istHour(at);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function longDateIst(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(at);
}
