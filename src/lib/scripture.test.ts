import { describe, expect, it } from "bun:test";
import {
  parseBibleReferences,
  formatReference,
  lookupVerse,
  detectVerses,
} from "./scripture";

describe("parseBibleReferences", () => {
  it("parses a simple chapter:verse reference", () => {
    expect(parseBibleReferences("John 3:16")).toEqual([
      { book: "John", chapter: 3, verse: 16, label: "John 3:16" },
    ]);
  });

  it("parses a chapter-only reference", () => {
    const refs = parseBibleReferences("Psalm 23");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ book: "Psalms", chapter: 23 });
    expect(refs[0].verse).toBeUndefined();
    expect(refs[0].label).toBe("Psalms 23");
  });

  it("parses a verse range within one chapter", () => {
    expect(parseBibleReferences("Proverbs 3:5-6")[0]).toMatchObject({
      book: "Proverbs",
      chapter: 3,
      verse: 5,
      verseEnd: 6,
      label: "Proverbs 3:5–6",
    });
  });

  it("parses a cross-chapter range", () => {
    expect(parseBibleReferences("John 3:16-4:2")[0]).toMatchObject({
      book: "John",
      chapter: 3,
      verse: 16,
      verseEnd: 2,
      chapterEnd: 4,
      label: "John 3:16–4:2",
    });
  });

  it("recognizes common abbreviations", () => {
    expect(parseBibleReferences("1 Cor 13:4")[0]).toMatchObject({
      book: "1 Corinthians",
      label: "1 Corinthians 13:4",
    });
    expect(parseBibleReferences("Ps 23:1")[0]).toMatchObject({
      book: "Psalms",
      label: "Psalms 23:1",
    });
    expect(parseBibleReferences("Matt 5:16")[0]).toMatchObject({
      book: "Matthew",
      label: "Matthew 5:16",
    });
  });

  it("returns multiple references in order of appearance", () => {
    const refs = parseBibleReferences("John 3:16 and Romans 8:28");
    expect(refs.map((r) => r.label)).toEqual(["John 3:16", "Romans 8:28"]);
  });

  it("does not match inside a longer word", () => {
    expect(parseBibleReferences("xJohn 3:16")).toEqual([]);
    expect(parseBibleReferences("VerseJohn 3:16")).toEqual([]);
  });

  it("does not match a bare number without a book", () => {
    expect(parseBibleReferences("no scripture here 42:1")).toEqual([]);
  });

  it("deduplicates repeated references to the same verse", () => {
    expect(parseBibleReferences("John 3:16 John 3:16")).toHaveLength(1);
  });

  it("parses a numbered book without emitting a bogus short-name match", () => {
    // "1 John 1:9" must not also produce a spurious "John 1:9".
    const refs = parseBibleReferences("1 John 1:9");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ book: "1 John", label: "1 John 1:9" });
  });

  it("parses multi-word book names", () => {
    const refs = parseBibleReferences("Song of Solomon 2:1");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ book: "Song of Solomon", label: "Song of Solomon 2:1" });
  });
});

describe("formatReference", () => {
  it("formats chapter-only", () => {
    expect(formatReference({ book: "Psalms", chapter: 23 })).toBe("Psalms 23");
  });
  it("formats chapter:verse", () => {
    expect(formatReference({ book: "John", chapter: 3, verse: 16 })).toBe(
      "John 3:16",
    );
  });
  it("formats a same-chapter range", () => {
    expect(
      formatReference({ book: "Proverbs", chapter: 3, verse: 5, verseEnd: 6 }),
    ).toBe("Proverbs 3:5–6");
  });
  it("formats a cross-chapter range", () => {
    expect(
      formatReference({
        book: "John",
        chapter: 3,
        verse: 16,
        chapterEnd: 4,
        verseEnd: 2,
      }),
    ).toBe("John 3:16–4:2");
  });
});

describe("lookupVerse", () => {
  it("returns the curated verse for a known reference", () => {
    const v = lookupVerse("John 3:16");
    expect(v?.reference).toBe("John 3:16");
    expect(v?.text).toContain("For God so loved the world");
  });

  it("matches via abbreviation", () => {
    expect(lookupVerse("Ps 23:1")?.reference).toBe("Psalm 23:1");
  });

  it("returns undefined for an uncurated reference", () => {
    expect(lookupVerse("Habakkuk 3:19")).toBeUndefined();
  });

  it("returns undefined for non-references", () => {
    expect(lookupVerse("hello world")).toBeUndefined();
  });
});

describe("detectVerses", () => {
  it("finds curated verses in a transcript", () => {
    const found = detectVerses("Tonight we read John 3:16 and Psalm 23:1.");
    expect(found.map((f) => f.reference)).toEqual(["John 3:16", "Psalms 23:1"]);
    expect(found[0].text).toContain("everlasting life");
    expect(found[1].text).toContain("shepherd");
  });

  it("includes a reference even when there is no curated text", () => {
    const found = detectVerses("See Obadiah 1:3 for context.");
    expect(found).toHaveLength(1);
    expect(found[0].reference).toBe("Obadiah 1:3");
    expect(found[0].text).toBe("");
  });
});
