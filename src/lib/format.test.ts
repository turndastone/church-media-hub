import { describe, expect, it } from "bun:test";
import { formatUSD, formatNGN, timeAgo, initials, pluralize } from "./format";

describe("formatUSD", () => {
  it("formats whole dollars", () => {
    expect(formatUSD(9)).toBe("$9.00");
  });
  it("formats cents", () => {
    expect(formatUSD(8.76)).toBe("$8.76");
  });
});

describe("formatNGN", () => {
  it("formats naira with no decimals", () => {
    expect(formatNGN(13140)).toBe("₦13,140");
  });
});

describe("timeAgo", () => {
  it("says just now for recent timestamps", () => {
    expect(timeAgo(Date.now() - 5_000)).toBe("just now");
  });
  it("reports minutes", () => {
    expect(timeAgo(Date.now() - 2 * 60_000)).toBe("2m ago");
  });
  it("reports hours", () => {
    expect(timeAgo(Date.now() - 5 * 3_600_000)).toBe("5h ago");
  });
  it("reports days", () => {
    expect(timeAgo(Date.now() - 3 * 86_400_000)).toBe("3d ago");
  });
});

describe("initials", () => {
  it("falls back for missing names", () => {
    expect(initials()).toBe("AW");
    expect(initials(null)).toBe("AW");
  });
  it("uses first two letters of a single word", () => {
    expect(initials("Alpha")).toBe("AL");
  });
  it("uses first and last word initials", () => {
    expect(initials("Alpha Worship One")).toBe("AO");
  });
});

describe("pluralize", () => {
  it("keeps singular for one", () => {
    expect(pluralize(1, "song")).toBe("1 song");
  });
  it("adds s for many", () => {
    expect(pluralize(3, "song")).toBe("3 songs");
  });
  it("handles zero", () => {
    expect(pluralize(0, "item")).toBe("0 items");
  });
});
