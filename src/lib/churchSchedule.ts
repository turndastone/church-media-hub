/**
 * Helpers for matching church programs to the current day and time.
 *
 * The program "day" field is free text (e.g. "Sundays", "Monday – Saturday",
 * "Every day", "First Friday of the month"), so matching is deliberately
 * heuristic: it understands day names, inclusive weekday ranges, recurring
 * "every day" programs, and "first/last X of the month" patterns.
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

/** True when the program's "day" description includes `now`'s weekday. */
export function isProgramToday(day: string, now: Date): boolean {
  const lower = day.toLowerCase().trim();
  if (!lower) return false;
  if (lower.includes("every day")) return true;

  // "First Friday of the month" / "Last Saturday of the month"
  const firstLast = lower.match(
    /^(first|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+of\s+the\s+month/,
  );
  if (firstLast) {
    const target = DAY_INDEX[firstLast[2] as DayName];
    const today = now.getDay();
    if (firstLast[1] === "first") {
      return today === target && now.getDate() <= 7;
    }
    const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return today === target && now.getDate() > lastDate - 7;
  }

  const dayNames = findDayNames(lower);
  if (dayNames.length === 0) return false;

  const today = now.getDay();
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
