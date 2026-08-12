"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { resolveSecret } from "./apiKeys";

/**
 * AI welcome assistant for the church website. Visitors chat with a friendly
 * assistant that answers questions about the church's profile, programs,
 * location, contacts, and social media.
 *
 * The client passes the church context (profile + programs, from the same
 * reactive queries that render the page) so the assistant is always in sync
 * with what's displayed. Powered by Google Gemini (GEMINI_API_KEY, set in the
 * API Keys page or the platform Keys tab — Google AI Studio free tier works
 * fine). When no key is configured yet, the action still answers with a
 * helpful, data-driven fallback so the welcome chat never appears broken.
 */
const MODEL = "gemini-2.0-flash";

export const churchInfoValidator = v.object({
  name: v.string(),
  tagline: v.string(),
  description: v.string(),
  welcomeMessage: v.string(),
  verse: v.string(),
  address: v.string(),
  phones: v.array(v.string()),
  emails: v.array(v.string()),
  socials: v.array(v.object({ platform: v.string(), url: v.string() })),
});
export type ChurchInfoLike = {
  name: string;
  tagline: string;
  description: string;
  welcomeMessage: string;
  verse: string;
  address: string;
  phones: string[];
  emails: string[];
  socials: { platform: string; url: string }[];
};

export const programValidator = v.object({
  title: v.string(),
  description: v.string(),
  category: v.string(),
  day: v.string(),
  time: v.string(),
  venue: v.optional(v.string()),
});
export type ProgramLike = {
  title: string;
  description: string;
  category: string;
  day: string;
  time: string;
  venue?: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  provincial: "Provincial",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function geminiChat(
  systemPrompt: string,
  messages: ChatMessage[],
  key: string,
): Promise<string> {
  const contents = messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gemini request failed (${res.status})`);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text.trim();
}

/** Data-driven fallback used until a Gemini key is configured (or on errors). */
function buildFallback(
  question: string,
  info: ChurchInfoLike | null,
  programs: ProgramLike[],
): string {
  const q = question.toLowerCase();
  const lines: string[] = [];
  const name = info?.name ?? "RCCG Solution Ambassador";

  if (q.includes("time") || q.includes("service") || q.includes("program")) {
    lines.push(`Here are our programs at ${name}:`);
    for (const cat of ["daily", "weekly", "monthly", "provincial"]) {
      const list = programs.filter((p) => p.category === cat).slice(0, 3);
      if (list.length === 0) continue;
      lines.push(`\n${CATEGORY_LABEL[cat] ?? cat}:`);
      for (const p of list) {
        lines.push(`• ${p.title} — ${p.day}, ${p.time}${p.venue ? ` (${p.venue})` : ""}`);
      }
    }
  } else if (q.includes("where") || q.includes("location") || q.includes("address") || q.includes("church")) {
    lines.push(
      info?.address
        ? `You can find ${name} at ${info.address}. We would love to host you!`
        : `${name} — reach out to us and we'll share directions.`,
    );
  } else if (q.includes("contact") || q.includes("phone") || q.includes("call") || q.includes("email")) {
    const phones = info?.phones?.length ? info.phones.join(", ") : "—";
    const emails = info?.emails?.length ? info.emails.join(", ") : "—";
    lines.push(
      `You can reach ${name} by phone at ${phones} or by email at ${emails}. We'd be glad to hear from you!`,
    );
  } else if (q.includes("social") || q.includes("facebook") || q.includes("youtube") || q.includes("instagram")) {
    const socials = info?.socials ?? [];
    if (socials.length > 0) {
      lines.push(
        `Follow ${name} online: ${socials.map((s) => `${s.platform} (${s.url})`).join(", ")}.`,
      );
    } else {
      lines.push(`Follow ${name} on Facebook, YouTube, Instagram, and more — links are on our site.`);
    }
  } else {
    lines.push(
      `Welcome to ${name}! I can tell you about our programs, service times, location, and contact details — just ask!`,
    );
  }
  return lines.join("\n");
}

export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    info: v.optional(churchInfoValidator),
    programs: v.optional(v.array(programValidator)),
  },
  handler: async (ctx, args): Promise<{ reply: string }> => {
    const history = args.messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-10);
    const last = history[history.length - 1];
    if (!last || last.role !== "user") {
      throw new Error("Nothing to respond to.");
    }

    const info = args.info ?? null;
    const programs = args.programs ?? [];
    const name = info?.name ?? "RCCG Solution Ambassador";
    const key =
      (await resolveSecret(ctx, "GEMINI_API_KEY")) ??
      process.env.GOOGLE_API_KEY;

    if (!key) {
      return { reply: buildFallback(last.content, info, programs) };
    }

    const programList = programs
      .map(
        (p) =>
          `- ${p.title} (${CATEGORY_LABEL[p.category] ?? p.category}): ${p.day}, ${p.time}${p.venue ? `, ${p.venue}` : ""} — ${p.description}`,
      )
      .join("\n");

    const socials = (info?.socials ?? [])
      .map((s) => `${s.platform}: ${s.url}`)
      .join("\n");

    const systemPrompt = `You are the friendly welcome assistant for ${name}, a parish of the Redeemed Christian Church of God.

Church profile:
- Tagline: ${info?.tagline ?? ""}
- About: ${info?.description ?? ""}
- Scripture: ${info?.verse ?? ""}
- Address: ${info?.address ?? ""}
- Phone numbers: ${(info?.phones ?? []).join(", ") || "not provided"}
- Emails: ${(info?.emails ?? []).join(", ") || "not provided"}

Programs:
${programList || "No programs listed yet."}

Social media:
${socials || "No links listed yet."}

Guidelines:
- Warm, welcoming, reverent, and concise. Address the visitor with grace and clarity.
- Answer questions about service times, programs, location, contact details, and social media using ONLY the profile above. If something isn't listed, say it isn't available yet and suggest contacting the church.
- Occasionally weave in the church's scripture (${info?.verse ?? ""}).
- Keep replies under 120 words unless asked for details. Use short, readable lines.`;

    try {
      const reply = await geminiChat(systemPrompt, history, key);
      return { reply };
    } catch {
      // AI hiccup → fall back to the data-driven answer so visitors are never stuck.
      return { reply: buildFallback(last.content, info, programs) };
    }
  },
});
