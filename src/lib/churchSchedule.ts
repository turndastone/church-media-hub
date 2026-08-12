/**
 * Helpers for matching church programs to the current day and time.
 *
 * The program "day" field is free text (e.g. "Sundays", "Monday – Saturday",
 * "Every day", "Every Third Sunday", "Second Friday of Every Month"), so
 * matching is deliberately heuristic: it understands day names, inclusive
 * weekday ranges, recurring "every day" programs, "every Nth weekday"
 * patterns, and "first/second/…/last X of every month" patterns.
 */

export interface ScheduleProgram {
  title: string;
  day: string;
  time: string;
  venue?: string;
  description: string;
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

const DAY_INDEX: Record<DayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function findDayNames(day: string): DayName[] {
  // Collect matches in the order they appear in the string so ranges like
  // "Saturday – Sunday" read as Sat→Sun, not Sun→Sat.
  const lower = day.toLowerCase();
  const found: { name: DayName; index: number }[] = [];
  for (const name of DAY_NAMES) {
    const index = lower.indexOf(name);
    if (index !== -1) found.push({ name, index });
  }
  return found.sort((a, b) => a.index - b.index).map((f) => f.name);
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
};

/** Which occurrence of today's weekday this is within the month (1-based). */
function nthWeekdayOfMonth(now: Date): number {
  return Math.ceil(now.getDate() / 7);
}

/** True when the program's "day" description includes `now`'s weekday. */
export function isProgramToday(day: string, now: Date): boolean {
  const lower = day.toLowerCase().trim();
  if (!lower) return false;
  if (lower.includes("every day")) return true;

  const today = now.getDay();
  const weekday = "(sunday|monday|tuesday|wednesday|thursday|friday|saturday)";

  // "Every Third Sunday" / "Every Second Friday"
  const ordinal = lower.match(new RegExp(`^every\\s+(first|second|third|fourth)\\s+${weekday}`));
  if (ordinal) {
    const target = DAY_INDEX[ordinal[2] as DayName];
    return today === target && nthWeekdayOfMonth(now) === ORDINALS[ordinal[1]];
  }

  // "First Sunday of Every Month" / "Second Friday of Every Month" /
  // "Last Friday of Every Month" (also accepts "of the month")
  const firstLast = lower.match(
    new RegExp(`^(first|second|third|fourth|last)\\s+${weekday}\\s+of\\s+(the|every)\\s+month`),
  );
  if (firstLast) {
    const target = DAY_INDEX[firstLast[2] as DayName];
    if (firstLast[1] === "last") {
      const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return today === target && now.getDate() > lastDate - 7;
    }
    return today === target && nthWeekdayOfMonth(now) === ORDINALS[firstLast[1]];
  }

  const dayNames = findDayNames(lower);
  if (dayNames.length === 0) return false;

  if (dayNames.length >= 2) {
    // Inclusive range such as "Monday – Saturday", handling week wrap-around.
    const start = DAY_INDEX[dayNames[0]];
    const end = DAY_INDEX[dayNames[1]];
    if (start <= end) return today >= start && today <= end;
    return today >= start || today <= end;
  }

  return today === DAY_INDEX[dayNames[0]];
}

/**
 * Parses the start of a time string like "8:30 AM – 12:00 PM" into minutes
 * since midnight. Times without a meridiem are treated as AM unless they look
 * like 24-hour times (13:00+). Returns null when no time can be parsed.
 */
export function parseStartMinutes(time: string): number | null {
  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = (match[3] ?? "").toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Sorts programs by their start time; unparseable times sort last. */
export function sortByStartTime<T extends ScheduleProgram>(programs: T[]): T[] {
  return [...programs].sort((a, b) => {
    const am = parseStartMinutes(a.time);
    const bm = parseStartMinutes(b.time);
    if (am === null && bm === null) return 0;
    if (am === null) return 1;
    if (bm === null) return -1;
    return am - bm;
  });
}
