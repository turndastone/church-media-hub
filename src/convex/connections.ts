import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { appValidator } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

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
    const { app, ...patch } = args;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("connections", {
      userId: user._id,
      app,
      host: patch.host ?? "",
      port: patch.port,
      password: patch.password,
      url: patch.url,
      token: patch.token,
      enabled: patch.enabled ?? false,
    });
  },
});

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
