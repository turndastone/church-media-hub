"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { toPassageId } from "../lib/bible-refs";

/**
 * API.Bible (American Bible Society) scripture lookup.
 * Backend key: BIBLE_API_KEY. Optional BIBLE_ID overrides the default KJV.
 */
const API = "https://api.scripture.api.bible/v1";
const KJV_BIBLE_ID = "de4e12af7f28f599-02";

let kjvIdCache: string | null = null;

export interface PassageResult {
  reference: string;
  text: string;
  copyright: string;
  verseCount: number;
}

export const lookupPassage = action({
  args: {
    book: v.string(),
    chapter: v.number(),
    verse: v.optional(v.number()),
    verseEnd: v.optional(v.number()),
    chapterEnd: v.optional(v.number()),
  },
  handler: async (_, args): Promise<PassageResult> => {
    const key = process.env.BIBLE_API_KEY;
    if (!key) {
      throw new Error(
        "Bible API isn't configured yet — add BIBLE_API_KEY in the project keys.",
      );
    }
    const passage = toPassageId(args);
    if (!passage) {
      throw new Error(`Unsupported reference: ${args.book} ${args.chapter}`);
    }
    let bibleId = process.env.BIBLE_ID || kjvIdCache || KJV_BIBLE_ID;

    const fetchPassage = async (bible: string, passageId: string) => {
      const qs =
        "include-verse-numbers=true&include-passage-references=false&content-type=text";
      const res = await fetch(
        `${API}/bibles/${encodeURIComponent(bible)}/passages/${encodeURIComponent(passageId)}?${qs}`,
        { headers: { "api-key": key } },
      );
      const body = (await res.json().catch(() => ({}))) as {
        data?: {
          content?: string;
          reference?: string;
          copyright?: string;
          verseCount?: number;
        };
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message ?? `Bible API responded ${res.status}`);
      }
      const d = body.data;
      return {
        reference: d?.reference ?? passageId,
        text: d?.content ?? "",
        copyright: d?.copyright ?? "",
        verseCount: d?.verseCount ?? 0,
      };
    };

    const resolveKjvId = async (): Promise<string | null> => {
      if (kjvIdCache) return kjvIdCache;
      try {
        const res = await fetch(`${API}/bibles?language=eng`, {
          headers: { "api-key": key },
        });
        if (!res.ok) return null;
        const body = (await res.json()) as {
          data?: { abbreviation?: string; id?: string }[];
        };
        const kjv = body.data?.find(
          (b) => b.abbreviation?.toUpperCase() === "KJV",
        );
        if (kjv?.id) kjvIdCache = kjv.id;
        return kjv?.id ?? null;
      } catch {
        return null;
      }
    };

    const lastError = () =>
      new Error(
        `Couldn't fetch ${passage}. Check BIBLE_API_KEY and that the reference is valid.`,
      );

    // Primary attempt, plus a graceful fallback to the start verse if an
    // unusual range format (e.g. cross-chapter) is rejected.
    const attempts = [passage];
    if (args.chapterEnd != null && args.verseEnd != null) {
      const start = toPassageId({
        book: args.book,
        chapter: args.chapter,
        verse: args.verse,
      });
      if (start && start !== passage) attempts.push(start);
    }

    for (const p of attempts) {
      try {
        return await fetchPassage(bibleId, p);
      } catch {
        // try the next fallback
      }
    }

    // If the default KJV id was wrong, resolve it from the /bibles listing.
    if (bibleId === KJV_BIBLE_ID) {
      const resolved = await resolveKjvId();
      if (resolved && resolved !== bibleId) {
        try {
          return await fetchPassage(resolved, passage);
        } catch {
          // fall through
        }
      }
    }

    throw lastError();
  },
});
