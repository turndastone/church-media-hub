import {
  action,
  internalAction,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedPayload,
} from "../lib/integrations/crypto";

/**
 * Deployment-wide service API keys (Gemini, Bible API, Stripe, Paystack, and
 * the Supabase client keys). Managed from the in-app API Keys page.
 *
 * Security rules (mirrors src/convex/connections.ts):
 * - `list` never returns values — only configured/encrypted flags.
 * - Values are encrypted at rest with AES-256-GCM when the
 *   `INTEGRATION_CRYPT_KEY` env var is set; otherwise they are stored as-is
 *   and the UI warns that encryption is off.
 * - `getSecret` decrypts on demand for backend consumers; `resolveSecret`
 *   prefers a stored value and falls back to the env var of the same name,
 *   so keys set in the platform Keys tab keep working too.
 */

/** The only key names that may be stored here. */
export const API_KEY_DEFS = [
  { key: "GEMINI_API_KEY", label: "Gemini API key" },
  { key: "BIBLE_API_KEY", label: "Bible API key" },
  { key: "BIBLE_ID", label: "Bible id (optional)" },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret key" },
  { key: "STRIPE_PRO_PRICE_ID", label: "Stripe Pro price id" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret" },
  { key: "PAYSTACK_SECRET_KEY", label: "Paystack secret key" },
  { key: "PAYSTACK_PLAN_CODE", label: "Paystack plan code (optional)" },
  { key: "VITE_SUPABASE_URL", label: "Supabase project URL" },
  { key: "VITE_SUPABASE_ANON_KEY", label: "Supabase anon key" },
] as const;

const ALLOWED = new Set<string>(API_KEY_DEFS.map((d) => d.key));

export interface ApiKeyStatus {
  key: string;
  configured: boolean;
  /** True when the stored value is encrypted at rest. */
  encrypted: boolean;
  updatedAt: number | null;
}

async function getRow(ctx: MutationCtx, key: string) {
  return ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
}

// ---- Queries ----------------------------------------------------------------

/** Presence flags for every known key — never the values themselves. */
export const list = query({
  args: {},
  handler: async (ctx): Promise<ApiKeyStatus[]> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const docs = await ctx.db.query("apiKeys").collect();
    const byKey = new Map(docs.map((d) => [d.key, d]));
    return API_KEY_DEFS.map((def) => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        configured: Boolean(row?.encryptedValue),
        encrypted: row ? isEncryptedPayload(row.encryptedValue) : false,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  },
});

// ---- Mutations --------------------------------------------------------------

/** Save (or clear) a key. Empty value removes the stored entry. */
export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    if (!ALLOWED.has(key)) throw new Error(`Unknown key: ${key}`);

    const existing = await getRow(ctx, key);
    const trimmed = value.trim();
    if (!trimmed) {
      if (existing) await ctx.db.delete(existing._id);
      return { configured: false, encrypted: false };
    }

    const crypt = process.env.INTEGRATION_CRYPT_KEY;
    let stored: string;
    let encrypted: boolean;
    if (crypt) {
      stored = await encryptSecret(trimmed, crypt);
      encrypted = true;
    } else {
      stored = trimmed;
      encrypted = false;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedValue: stored,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("apiKeys", {
        key,
        encryptedValue: stored,
        updatedAt: Date.now(),
      });
    }
    return { configured: true, encrypted };
  },
});

export const remove = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    if (!ALLOWED.has(key)) throw new Error(`Unknown key: ${key}`);
    const existing = await getRow(ctx, key);
    if (existing) await ctx.db.delete(existing._id);
    return true;
  },
});

// ---- Backend consumers ------------------------------------------------------

/** Server-internal: the raw stored payload for a key. */
export const getRaw = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.encryptedValue ?? null;
  },
});

/** Decrypt the stored value for a key, or null when unset/undecryptable. */
export const getSecret = internalAction({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<string | null> => {
    const stored = await ctx.runQuery(internal.apiKeys.getRaw, { key });
    if (!stored) return null;
    if (isEncryptedPayload(stored)) {
      const crypt = process.env.INTEGRATION_CRYPT_KEY;
      if (!crypt) return null;
      try {
        return await decryptSecret(stored, crypt);
      } catch {
        return null;
      }
    }
    return stored;
  },
});

/** Decrypted Supabase client keys for the browser (public-by-design). */
export const getClientKeys = action({
  args: {},
  handler: async (ctx): Promise<{ url: string; anonKey: string } | null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const url = await resolveSecret(ctx, "VITE_SUPABASE_URL");
    const anonKey = await resolveSecret(ctx, "VITE_SUPABASE_ANON_KEY");
    if (!url || !anonKey) return null;
    return { url, anonKey };
  },
});

/** Stored value first, then the env var of the same name. */
export async function resolveSecret(
  ctx: ActionCtx,
  key: string,
): Promise<string | null> {
  try {
    const stored = await ctx.runAction(internal.apiKeys.getSecret, { key });
    if (stored) return stored;
  } catch {
    // fall through to the env fallback
  }
  return process.env[key] ?? null;
}
