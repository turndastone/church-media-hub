// Canonical book name → USFM id (used by API.Bible passage ids like "JHN.3.16").
// Pure module shared by the Convex lookup action and unit tests.

export const USFM_BY_BOOK: Record<string, string> = {
  Genesis: "GEN",
  Exodus: "EXO",
  Leviticus: "LEV",
  Numbers: "NUM",
  Deuteronomy: "DEU",
  Joshua: "JOS",
  Judges: "JDG",
  Ruth: "RUT",
  "1 Samuel": "1SA",
  "2 Samuel": "2SA",
  "1 Kings": "1KI",
  "2 Kings": "2KI",
  "1 Chronicles": "1CH",
  "2 Chronicles": "2CH",
  Ezra: "EZR",
  Nehemiah: "NEH",
  Esther: "EST",
  Job: "JOB",
  Psalms: "PSA",
  Proverbs: "PRO",
  Ecclesiastes: "ECC",
  "Song of Solomon": "SNG",
  Isaiah: "ISA",
  Jeremiah: "JER",
  Lamentations: "LAM",
  Ezekiel: "EZK",
  Daniel: "DAN",
  Hosea: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obadiah: "OBA",
  Jonah: "JON",
  Micah: "MIC",
  Nahum: "NAM",
  Habakkuk: "HAB",
  Zephaniah: "ZEP",
  Haggai: "HAG",
  Zechariah: "ZEC",
  Malachi: "MAL",
  Matthew: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Romans: "ROM",
  "1 Corinthians": "1CO",
  "2 Corinthians": "2CO",
  Galatians: "GAL",
  Ephesians: "EPH",
  Philippians: "PHP",
  Colossians: "COL",
  "1 Thessalonians": "1TH",
  "2 Thessalonians": "2TH",
  "1 Timothy": "1TI",
  "2 Timothy": "2TI",
  Titus: "TIT",
  Philemon: "PHM",
  Hebrews: "HEB",
  James: "JAS",
  "1 Peter": "1PE",
  "2 Peter": "2PE",
  "1 John": "1JN",
  "2 John": "2JN",
  "3 John": "3JN",
  Jude: "JUD",
  Revelation: "REV",
};

export interface PassageParts {
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  chapterEnd?: number;
}

export function bookToUsfm(book: string): string | undefined {
  return USFM_BY_BOOK[book];
}

/**
 * Build an API.Bible passage id (e.g. "JHN.3.16", "JHN.3.16-18",
 * "JHN.3.16-JHN.4.2") from parsed reference parts. Returns null when the
 * book name is unknown or the chapter is missing.
 */
export function toPassageId(p: PassageParts): string | null {
  const id = USFM_BY_BOOK[p.book];
  if (!id || !p.chapter || p.chapter < 1) return null;
  const base = `${id}.${p.chapter}`;
  if (p.verse == null || p.verse < 1) return base;
  if (p.chapterEnd != null && p.verseEnd != null) {
    return `${base}.${p.verse}-${id}.${p.chapterEnd}.${p.verseEnd}`;
  }
  if (p.verseEnd != null) return `${base}.${p.verse}-${p.verseEnd}`;
  return `${base}.${p.verse}`;
}
