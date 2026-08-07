import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { appValidator, type AppKey } from "./schema";
import { validateConnectorUrl } from "../lib/integrations/connector";
import { decryptSecret, encryptSecret, isEncryptedPayload } from "../lib/integrations/crypto";
import { Id } from "./_generated/dataModel";

/**
 * Connection config for the desktop integrations (OBS / EasyWorship / PewBeam).
 *
 * Security rules enforced here:
 * - `list` never returns secrets — only config + a `secretsStored` flag.
 * - Secrets (OBS websocket password, connector tokens) are encrypted at rest
 *   with AES-256-GCM using the `INTEGRATION_CRYPT_KEY` env var. If that key is
 *   not configured, secrets are NOT persisted (the operator can still connect
 *   for the session, and the UI warns about it).
 * - All inputs are validated; credentials in URLs are rejected.
 */

/** Public shape of a connection doc — never contains password/token. */
export interface SafeConnection {
  _id: Id<"connections">;
  _creationTime: number;
  app: AppKey;
  host: string;
  port?: number;
  url?: string;
  enabled: boolean;
  lastConnectedAt?: number;
  /** True when the saved credential payloads are encrypted at rest. */
  secretsStored: boolean;
}

function toSafe(doc: {
  _id: Id<"connections">;
  _creationTime: number;
  app: AppKey;
  host: string;
  port?: number;
  url?: string;
  password?: string;
  token?: string;
  enabled: boolean;
  lastConnectedAt?: number;
}): SafeConnection {
  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    app: doc.app,
    host: doc.host,
    port: doc.port,
    url: doc.url,
    enabled: doc.enabled,
    lastConnectedAt: doc.lastConnectedAt,
    secretsStored: isEncryptedPayload(doc.password) || isEncryptedPayload(doc.token),
  };
}

// ---- Validation -------------------------------------------------------------

const HOST_RE = /^[a-zA-Z0-9._-]+$/;

function validateHost(host: string): string | null {
  const h = host.trim();
  if (!h) return "Host is required.";
  if (h.length > 253 || !HOST_RE.test(h)) {
    return "Host must be a hostname or IP address without protocol or slashes.";
  }
  return null;
}

function validatePort(port: number): string | null {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "Port must be an integer between 1 and 65535.";
  }
  return null;
}

// ---- Queries ----------------------------------------------------------------

export const list = query({
  args: {},
  handler: async (ctx): Promise<SafeConnection[]> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const docs = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return docs.map(toSafe);
  },
});

/** Decrypt the stored secrets for the current user (owner-only). */
export const secrets = action({
  args: { app: appValidator },
  handler: async (ctx, { app }): Promise<{ password: string | null; token: string | null }> => {
    const raw = await ctx.runQuery(internal.connections.getRawSecrets, { app });
    if (!raw) return { password: null, token: null };

    const key = process.env.INTEGRATION_CRYPT_KEY;
    let password: string | null = null;
    let token: string | null = null;
    if (key) {
      if (isEncryptedPayload(raw.password)) {
        try {
          password = await decryptSecret(raw.password, key);
        } catch {
          password = null;
        }
      }
      if (isEncryptedPayload(raw.token)) {
        try {
          token = await decryptSecret(raw.token, key);
        } catch {
          token = null;
        }
      }
    }
    return { password, token };
  },
});

/** Server-internal: the encrypted payloads for the current user. */
export const getRawSecrets = internalQuery({
  args: { app: appValidator },
  handler: async (ctx, { app }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const doc = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("app"), app))
      .first();
    if (!doc) return null;
    return { password: doc.password, token: doc.token };
  },
});

// ---- Mutations --------------------------------------------------------------

export const upsert = mutation({
  args: {
    app: appValidator,
    host: v.optional(v.string()),
    port: v.optional(v.number()),
    password: v.optional(v.string()),
    url: v.optional(v.string()),
    token: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("app"), args.app))
      .first();

    // Validate whatever the operator is actually changing.
    if (args.host !== undefined) {
      const err = validateHost(args.host);
      if (err) throw new Error(err);
    }
    if (args.port !== undefined) {
      const err = validatePort(args.port);
      if (err) throw new Error(err);
    }
    if (args.url !== undefined && args.url.trim() !== "") {
      const err = validateConnectorUrl(args.url);
      if (err) throw new Error(err);
    }

    // Secrets are encrypted at rest only when the operator has set the key.
    const key = process.env.INTEGRATION_CRYPT_KEY;
    let secretsStored = true;
    const encryptIfSet = async (
      value: string | undefined,
      current: string | undefined,
      set: (encrypted: string | undefined) => void,
    ): Promise<void> => {
      if (value === undefined) {
        // Keep whatever is already stored.
        set(current);
        return;
      }
      if (value === "") {
        // Empty means "clear the stored secret".
        set(undefined);
        return;
      }
      if (!key) {
        secretsStored = false;
        set(undefined);
        return;
      }
      set(await encryptSecret(value, key));
    };

    const base: {
      userId: Id<"users">;
      app: AppKey;
      host: string;
      port?: number;
      password?: string;
      url?: string;
      token?: string;
      enabled: boolean;
    } = {
      userId: user._id,
      app: args.app,
      host: (existing?.host ?? args.host ?? "").trim(),
      port: existing?.port ?? args.port,
      enabled: existing?.enabled ?? args.enabled ?? false,
      url: existing?.url ?? args.url,
    };

    await encryptIfSet(args.password, existing?.password, (v) => {
      if (v === undefined) delete base.password;
      else base.password = v;
    });
    await encryptIfSet(args.token, existing?.token, (v) => {
      if (v === undefined) delete base.token;
      else base.token = v;
    });

    if (args.host !== undefined) base.host = args.host.trim();
    if (args.port !== undefined) base.port = args.port;
    if (args.url !== undefined) {
      base.url = args.url.trim() === "" ? undefined : args.url.trim();
    }
    if (args.enabled !== undefined) base.enabled = args.enabled;

    let id: Id<"connections">;
    if (existing) {
      const { app: _app, ...patch } = base;
      await ctx.db.patch(existing._id, patch);
      id = existing._id;
    } else {
      id = await ctx.db.insert("connections", base);
    }
    return { id, secretsStored };
  },
});

/** Mark an integration as successfully connected (enabled + lastConnectedAt). */
export const touch = mutation({
  args: { app: appValidator },
  handler: async (ctx, { app }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("app"), app))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        lastConnectedAt: Date.now(),
      });
    }
    return existing?._id ?? null;
  },
});

/** Toggle an integration on/off without touching its config. */
export const toggle = mutation({
  args: { app: appValidator },
  handler: async (ctx, { app }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("app"), app))
      .first();
    if (!existing) throw new Error("Connection not configured.");
    await ctx.db.patch(existing._id, { enabled: !existing.enabled });
    return !existing.enabled;
  },
});

export const remove = mutation({
  args: { app: appValidator },
  handler: async (ctx, { app }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("app"), app))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return true;
  },
});
