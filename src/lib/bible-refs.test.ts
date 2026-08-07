import { describe, expect, it } from "bun:test";
import { USFM_BY_BOOK, bookToUsfm, toPassageId } from "./bible-refs";

describe("USFM_BY_BOOK", () => {
  it("covers all 66 canonical books", () => {
    expect(Object.keys(USFM_BY_BOOK)).toHaveLength(66);
  });

  it("maps familiar books correctly", () => {
    expect(bookToUsfm("John")).toBe("JHN");
    expect(bookToUsfm("Psalms")).toBe("PSA");
    expect(bookToUsfm("1 Corinthians")).toBe("1CO");
    expect(bookToUsfm("Song of Solomon")).toBe("SNG");
    expect(bookToUsfm("Revelation")).toBe("REV");
  });

  it("returns undefined for unknown books", () => {
    expect(bookToUsfm("Gospels")).toBeUndefined();
  });
});

describe("toPassageId", () => {
  it("builds a chapter-only id", () => {
    expect(toPassageId({ book: "Psalms", chapter: 23 })).toBe("PSA.23");
  });

  it("builds a chapter:verse id", () => {
    expect(toPassageId({ book: "John", chapter: 3, verse: 16 })).toBe(
      "JHN.3.16",
    );
  });

  it("builds a same-chapter range id", () => {
    expect(
      toPassageId({ book: "Proverbs", chapter: 3, verse: 5, verseEnd: 6 }),
    ).toBe("PRO.3.5-6");
  });

  it("builds a cross-chapter range id", () => {
    expect(
      toPassageId({
        book: "John",
        chapter: 3,
        verse: 16,
        chapterEnd: 4,
        verseEnd: 2,
      }),
    ).toBe("JHN.3.16-JHN.4.2");
  });

  it("returns null for unknown books or invalid chapters", () => {
    expect(toPassageId({ book: "Gospels", chapter: 1 })).toBeNull();
    expect(toPassageId({ book: "John", chapter: 0 })).toBeNull();
  });
});
