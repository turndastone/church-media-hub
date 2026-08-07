// Bible reference parsing + curated verses (King James Version, public domain).

export interface BibleBook {
  name: string;
  aliases: string[];
}

export const BOOKS: BibleBook[] = [
  { name: "Genesis", aliases: ["Genesis", "Gen", "Ge"] },
  { name: "Exodus", aliases: ["Exodus", "Exod", "Ex"] },
  { name: "Leviticus", aliases: ["Leviticus", "Lev", "Le"] },
  { name: "Numbers", aliases: ["Numbers", "Num", "Nu"] },
  { name: "Deuteronomy", aliases: ["Deuteronomy", "Deut", "Dt"] },
  { name: "Joshua", aliases: ["Joshua", "Josh"] },
  { name: "Judges", aliases: ["Judges", "Judg"] },
  { name: "Ruth", aliases: ["Ruth"] },
  { name: "1 Samuel", aliases: ["1 Samuel", "1Sam", "1 Sam"] },
  { name: "2 Samuel", aliases: ["2 Samuel", "2Sam", "2 Sam"] },
  { name: "1 Kings", aliases: ["1 Kings", "1Kgs", "1 Kgs"] },
  { name: "2 Kings", aliases: ["2 Kings", "2Kgs", "2 Kgs"] },
  { name: "1 Chronicles", aliases: ["1 Chronicles", "1Chr", "1 Chr"] },
  { name: "2 Chronicles", aliases: ["2 Chronicles", "2Chr", "2 Chr"] },
  { name: "Ezra", aliases: ["Ezra"] },
  { name: "Nehemiah", aliases: ["Nehemiah", "Neh"] },
  { name: "Esther", aliases: ["Esther", "Esth"] },
  { name: "Job", aliases: ["Job"] },
  { name: "Psalms", aliases: ["Psalms", "Psalm", "Ps"] },
  { name: "Proverbs", aliases: ["Proverbs", "Prov", "Pr"] },
  { name: "Ecclesiastes", aliases: ["Ecclesiastes", "Eccl", "Ecc"] },
  { name: "Song of Solomon", aliases: ["Song of Solomon", "Song of Songs", "Songs", "Song"] },
  { name: "Isaiah", aliases: ["Isaiah", "Isa"] },
  { name: "Jeremiah", aliases: ["Jeremiah", "Jer"] },
  { name: "Lamentations", aliases: ["Lamentations", "Lam"] },
  { name: "Ezekiel", aliases: ["Ezekiel", "Ezek"] },
  { name: "Daniel", aliases: ["Daniel", "Dan"] },
  { name: "Hosea", aliases: ["Hosea", "Hos"] },
  { name: "Joel", aliases: ["Joel"] },
  { name: "Amos", aliases: ["Amos"] },
  { name: "Obadiah", aliases: ["Obadiah", "Obad"] },
  { name: "Jonah", aliases: ["Jonah"] },
  { name: "Micah", aliases: ["Micah", "Mic"] },
  { name: "Nahum", aliases: ["Nahum", "Nah"] },
  { name: "Habakkuk", aliases: ["Habakkuk", "Hab"] },
  { name: "Zephaniah", aliases: ["Zephaniah", "Zeph"] },
  { name: "Haggai", aliases: ["Haggai", "Hag"] },
  { name: "Zechariah", aliases: ["Zechariah", "Zech"] },
  { name: "Malachi", aliases: ["Malachi", "Mal"] },
  { name: "Matthew", aliases: ["Matthew", "Matt", "Mt"] },
  { name: "Mark", aliases: ["Mark"] },
  { name: "Luke", aliases: ["Luke", "Lk"] },
  { name: "John", aliases: ["John", "Jn", "Joh"] },
  { name: "Acts", aliases: ["Acts"] },
  { name: "Romans", aliases: ["Romans", "Rom"] },
  { name: "1 Corinthians", aliases: ["1 Corinthians", "1Cor", "1 Cor"] },
  { name: "2 Corinthians", aliases: ["2 Corinthians", "2Cor", "2 Cor"] },
  { name: "Galatians", aliases: ["Galatians", "Gal"] },
  { name: "Ephesians", aliases: ["Ephesians", "Eph"] },
  { name: "Philippians", aliases: ["Philippians", "Phil"] },
  { name: "Colossians", aliases: ["Colossians", "Col"] },
  { name: "1 Thessalonians", aliases: ["1 Thessalonians", "1Thess", "1 Thess"] },
  { name: "2 Thessalonians", aliases: ["2 Thessalonians", "2Thess", "2 Thess"] },
  { name: "1 Timothy", aliases: ["1 Timothy", "1Tim", "1 Tim"] },
  { name: "2 Timothy", aliases: ["2 Timothy", "2Tim", "2 Tim"] },
  { name: "Titus", aliases: ["Titus"] },
  { name: "Philemon", aliases: ["Philemon", "Phlm"] },
  { name: "Hebrews", aliases: ["Hebrews", "Heb"] },
  { name: "James", aliases: ["James", "Jas"] },
  { name: "1 Peter", aliases: ["1 Peter", "1Pet", "1 Pet"] },
  { name: "2 Peter", aliases: ["2 Peter", "2Pet", "2 Pet"] },
  { name: "1 John", aliases: ["1 John", "1Jn", "1 Jn"] },
  { name: "2 John", aliases: ["2 John", "2Jn", "2 Jn"] },
  { name: "3 John", aliases: ["3 John", "3Jn", "3 Jn"] },
  { name: "Jude", aliases: ["Jude"] },
  { name: "Revelation", aliases: ["Revelation", "Rev"] },
];

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

export interface ParsedRef {
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  chapterEnd?: number;
  label: string;
}

export function parseBibleReferences(text: string): ParsedRef[] {
  type Candidate = { ref: ParsedRef; start: number; end: number };
  const found: Candidate[] = [];
  for (const book of BOOKS) {
    for (const alias of book.aliases) {
      const esc = alias.replace(ESCAPE_RE, "\\$&");
      const re = new RegExp(
        `(^|[^A-Za-z0-9])${esc}\\s+(\\d{1,3})(?::(\\d{1,3})(?:-((?:\\d{1,3})?:?\\d{1,3}))?)?`,
        "gi",
      );
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const chapter = parseInt(m[2], 10);
        const verse = m[3] ? parseInt(m[3], 10) : undefined;
        let verseEnd: number | undefined;
        let chapterEnd: number | undefined;
        if (m[4]) {
          const range = m[4].trim();
          const parts = range.split(":");
          if (parts.length === 2) {
            chapterEnd = parseInt(parts[0], 10);
            verseEnd = parseInt(parts[1], 10);
          } else {
            verseEnd = parseInt(parts[0], 10);
          }
        }
        const ref: ParsedRef = {
          book: book.name,
          chapter,
          verse,
          verseEnd,
          chapterEnd,
          label: formatReference({
            book: book.name,
            chapter,
            verse,
            verseEnd,
            chapterEnd,
          }),
        };
        const start = m.index + m[1].length;
        const end = start + alias.length;
        // de-dupe matches for the same verse
        const dup = found.some(
          (f) =>
            f.ref.book === ref.book &&
            f.ref.chapter === ref.chapter &&
            f.ref.verse === ref.verse,
        );
        if (!dup) found.push({ ref, start, end });
      }
    }
  }
  found.sort((a, b) => a.start - b.start);
  // Drop shorter aliases swallowed by a longer numbered-book match,
  // e.g. "1 John 1:9" must not also emit a bogus "John 1:9".
  const keptSpans: { start: number; end: number }[] = [];
  const out: ParsedRef[] = [];
  for (const c of found) {
    const covered = keptSpans.some(
      (k) => c.start >= k.start && c.start < k.end,
    );
    if (covered) continue;
    keptSpans.push({ start: c.start, end: c.end });
    out.push(c.ref);
  }
  return out;
}

export function formatReference(r: Omit<ParsedRef, "label">): string {
  if (!r.verse) return `${r.book} ${r.chapter}`;
  if (r.chapterEnd && r.verseEnd) {
    return `${r.book} ${r.chapter}:${r.verse}–${r.chapterEnd}:${r.verseEnd}`;
  }
  if (r.verseEnd) return `${r.book} ${r.chapter}:${r.verse}–${r.verseEnd}`;
  return `${r.book} ${r.chapter}:${r.verse}`;
}

export interface CuratedVerse {
  reference: string;
  text: string;
}

export const CURATED_VERSES: CuratedVerse[] = [
  { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want." },
  { reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { reference: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { reference: "Proverbs 3:5-6", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." },
  { reference: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
  { reference: "1 Corinthians 13:4", text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up." },
  { reference: "Matthew 5:16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { reference: "Joshua 1:9", text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest." },
  { reference: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen." },
  { reference: "Psalm 46:10", text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
  { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { reference: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
  { reference: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind." },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law." },
  { reference: "Psalm 121:1-2", text: "I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth." },
  { reference: "Proverbs 18:10", text: "The name of the LORD is a strong tower: the righteous runneth into it, and is safe." },
  { reference: "1 John 1:9", text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness." },
  { reference: "Psalm 34:8", text: "O taste and see that the LORD is good: blessed is the man that trusteth in him." },
  { reference: "Micah 6:8", text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?" },
  { reference: "Ephesians 2:8-9", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: not of works, lest any man should boast." },
  { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },
  { reference: "Psalm 27:1", text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?" },
  { reference: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { reference: "1 Peter 5:7", text: "Casting all your care upon him; for he careth for you." },
  { reference: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { reference: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path." },
  { reference: "Romans 10:9", text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved." },
  { reference: "Psalm 37:4", text: "Delight thyself also in the LORD; and he shall give thee the desires of thine heart." },
];

export function lookupVerse(reference: string): CuratedVerse | undefined {
  const parsed = parseBibleReferences(reference)[0];
  if (!parsed) return undefined;
  return CURATED_VERSES.find((c) => {
    const cParsed = parseBibleReferences(c.reference)[0];
    return (
      cParsed.book === parsed.book &&
      cParsed.chapter === parsed.chapter &&
      cParsed.verse === parsed.verse
    );
  });
}

export function detectVerses(text: string): { reference: string; text: string }[] {
  const parsed = parseBibleReferences(text);
  const seen = new Set<string>();
  const out: { reference: string; text: string }[] = [];
  for (const p of parsed) {
    if (seen.has(p.label)) continue;
    seen.add(p.label);
    const curated = lookupVerse(p.label);
    out.push({ reference: p.label, text: curated?.text ?? "" });
  }
  return out;
}
