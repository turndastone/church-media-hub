"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { toPassageId } from "../lib/bible-refs";
import { resolveSecret } from "./apiKeys";

/**
 * API.Bible (American Bible Society) scripture lookup.
 * Backend key: BIBLE_API_KEY. Optional BIBLE_ID overrides the default KJV.
 * Keys can be set in the in-app API Keys page (stored encrypted) or in the
 * platform Keys tab. The `version` arg accepts a Bible abbreviation (KJV,
 * NIV, ESV, NLT…) that is resolved to a bible id from the /bibles listing
 * (cached per instance).
 */
const API = "https://api.scripture.api.bible/v1";
const KJV_BIBLE_ID = "de4e12af7f28f599-02";

let biblesCache: Record<string, string> | null = null;

export interface PassageResult {
  reference: string;
  text: string;
  copyright: string;
  verseCount: number;
}

async function resolveBibleId(
  apiKey: string,
  abbreviation: string,
): Promise<string | null> {
  if (!biblesCache) {
    try {
      const res = await fetch(`${API}/bibles?language=eng`, {
        headers: { "api-key": apiKey },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          data?: { abbreviation?: string; id?: string }[];
        };
        const map: Record<string, string> = {};
        for (const b of body.data ?? []) {
          const key = b.abbreviation?.toUpperCase();
          if (key && b.id && !(key in map)) map[key] = b.id;
        }
        biblesCache = map;
      }
    } catch {
      // keep cache null; callers fall back
    }
  }
  return biblesCache?.[abbreviation.toUpperCase()] ?? null;
}

export const lookupPassage = action({
  args: {
    book: v.string(),
    chapter: v.number(),
    verse: v.optional(v.number()),
    verseEnd: v.optional(v.number()),
    chapterEnd: v.optional(v.number()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PassageResult> => {
    const key = await resolveSecret(ctx, "BIBLE_API_KEY");
    if (!key) {
      throw new Error(
        "Bible API isn't configured yet — add a key in API Keys or the project keys.",
      );
    }
    const passage = toPassageId(args);
    if (!passage) {
      throw new Error(`Unsupported reference: ${args.book} ${args.chapter}`);
    }

    const want = (args.version ?? "KJV").toUpperCase();
    let bibleId =
      (await resolveSecret(ctx, "BIBLE_ID")) || process.env.BIBLE_ID || KJV_BIBLE_ID;
    if (want !== "KJV") {
      bibleId = (await resolveBibleId(key, want)) ?? bibleId;
    }

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

    throw new Error(
      `Couldn't fetch ${passage} (${want}). Check BIBLE_API_KEY, the reference, and that the ${want} translation is authorized for your account.`,
    );
  },
});
