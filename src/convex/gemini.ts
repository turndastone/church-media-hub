"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Google Gemini (AI Studio) integration. Backend key: GEMINI_API_KEY
 * (GOOGLE_API_KEY is accepted as an alias). All prompts request JSON output.
 */
const MODEL = "gemini-2.0-flash";

async function geminiJson(prompt: string, temperature = 0.6): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "Gemini isn't configured yet — add GEMINI_API_KEY in the project keys.",
    );
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: "application/json" },
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
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }
}

export interface SermonSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  suggestedReferences: string[];
}

/** Summarize a sermon transcript for the projection/media team. */
export const summarizeSermon = action({
  args: { transcript: v.string() },
  handler: async (_, args): Promise<SermonSummary> => {
    if (!args.transcript.trim()) throw new Error("Transcript is empty.");
    const prompt = `You are the media assistant for Alpha Worship One, a church presentation tool used by media teams to project scripture and run live services.

Given a sermon transcript, produce a concise operational summary for the projection team.

Return ONLY JSON with exactly this shape (no markdown, no comments):
{
  "title": "a short sermon title, 8 words or fewer",
  "summary": "2-3 sentence plain-language summary of the sermon's main point",
  "keyPoints": ["3 to 5 short bullet points, each 12 words or fewer"],
  "suggestedReferences": ["up to 3 Bible references in standard form, e.g. John 3:16"]
}

Transcript:
"""
${args.transcript}
"""`;
    const raw = (await geminiJson(prompt, 0.6)) as Partial<SermonSummary>;
    return {
      title:
        typeof raw.title === "string" && raw.title.trim()
          ? raw.title.trim()
          : "Sermon",
      summary:
        typeof raw.summary === "string" && raw.summary.trim()
          ? raw.summary.trim()
          : "",
      keyPoints: Array.isArray(raw.keyPoints)
        ? raw.keyPoints.filter(
            (k): k is string => typeof k === "string" && k.trim().length > 0,
          )
        : [],
      suggestedReferences: Array.isArray(raw.suggestedReferences)
        ? raw.suggestedReferences.filter(
            (r): r is string => typeof r === "string" && r.trim().length > 0,
          )
        : [],
    };
  },
});

/** Short, reverent explanation of a verse for an operator to read as an intro. */
export const explainVerse = action({
  args: {
    reference: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (_, args): Promise<{ explanation: string }> => {
    const prompt = `You are the media assistant for Alpha Worship One, a church presentation tool.
Explain the following Bible verse in 2-3 plain sentences that a media operator could read aloud as an intro before projecting it. Keep it clear, reverent, and non-denominational.

Reference: ${args.reference}
Text: ${args.text || "(verse text unavailable — explain the reference itself)"}

Return ONLY JSON with exactly this shape:
{ "explanation": "the explanation" }`;
    const raw = (await geminiJson(prompt, 0.7)) as { explanation?: unknown };
    return {
      explanation:
        typeof raw.explanation === "string" && raw.explanation.trim()
          ? raw.explanation.trim()
          : "",
    };
  },
});
