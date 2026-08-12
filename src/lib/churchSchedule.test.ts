import { describe, expect, it } from "bun:test";
import {
  isProgramToday,
  parseStartMinutes,
  sortByStartTime,
} from "./churchSchedule";

// August 2026: the 1st is a Saturday, the 7th is the first Friday, the 29th is
// the last Saturday.
const WED = new Date(2026, 7, 12); // Wednesday, August 12
const SUN = new Date(2026, 7, 16); // Sunday, August 16

describe("isProgramToday", () => {
  it("matches every-day programs", () => {
    expect(isProgramToday("Every day", WED)).toBe(true);
    expect(isProgramToday("Every day", SUN)).toBe(true);
  });

  it("matches a single weekday", () => {
    expect(isProgramToday("Sundays", SUN)).toBe(true);
    expect(isProgramToday("Sundays", WED)).toBe(false);
  });

  it("matches inclusive weekday ranges", () => {
    expect(isProgramToday("Monday – Saturday", WED)).toBe(true);
    expect(isProgramToday("Monday – Saturday", SUN)).toBe(false);
    expect(isProgramToday("Saturday – Sunday", SUN)).toBe(true);
    expect(isProgramToday("Saturday – Sunday", WED)).toBe(false);
  });

  it("matches first-of-month programs only on the right weekday", () => {
    expect(isProgramToday("First Friday of the month", new Date(2026, 7, 7))).toBe(true);
    expect(isProgramToday("First Friday of the month", new Date(2026, 7, 14))).toBe(false);
  });

  it("matches last-of-month programs within the final week", () => {
    expect(isProgramToday("Last Saturday of the month", new Date(2026, 7, 29))).toBe(true);
    expect(isProgramToday("Last Saturday of the month", new Date(2026, 7, 22))).toBe(false);
  });

  it("ignores annual, quarterly, and non-day descriptions", () => {
    expect(isProgramToday("Annually · July", WED)).toBe(false);
    expect(isProgramToday("Quarterly", WED)).toBe(false);
    expect(isProgramToday("All week", WED)).toBe(false);
  });

  it("handles empty and odd input", () => {
    expect(isProgramToday("", WED)).toBe(false);
    expect(isProgramToday("   ", WED)).toBe(false);
  });
});

describe("parseStartMinutes", () => {
  it("parses 12-hour times with meridiem", () => {
    expect(parseStartMinutes("8:30 AM – 12:00 PM")).toBe(510);
    expect(parseStartMinutes("6:00 PM – Midnight")).toBe(1080);
    expect(parseStartMinutes("12:00 AM")).toBe(0);
    expect(parseStartMinutes("12:00 PM")).toBe(720);
  });

  it("treats times without a meridiem as AM", () => {
    expect(parseStartMinutes("5:00 – 6:00 AM")).toBe(300);
    expect(parseStartMinutes("7:30 – 8:30 AM")).toBe(450);
  });

  it("keeps 24-hour times as-is", () => {
    expect(parseStartMinutes("18:00 – 20:00")).toBe(1080);
  });

  it("returns null when no time is present", () => {
    expect(parseStartMinutes("All week")).toBe(null);
    expect(parseStartMinutes("")).toBe(null);
  });
});

describe("sortByStartTime", () => {
  it("sorts programs earliest-first", () => {
    const programs = [
      { title: "Evening", day: "", time: "6:00 PM", description: "" },
      { title: "Dawn", day: "", time: "5:00 AM", description: "" },
      { title: "Morning", day: "", time: "8:30 AM", description: "" },
    ];
    expect(sortByStartTime(programs).map((p) => p.title)).toEqual([
      "Dawn",
      "Morning",
      "Evening",
    ]);
  });

  it("pushes unparseable times to the end", () => {
    const programs = [
      { title: "Open", day: "", time: "All week", description: "" },
      { title: "Timed", day: "", time: "9:00 AM", description: "" },
    ];
    expect(sortByStartTime(programs).map((p) => p.title)).toEqual([
      "Timed",
      "Open",
    ]);
  });
});
