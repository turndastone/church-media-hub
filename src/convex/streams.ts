import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { streamPlatformValidator } from "./schema";

/** Saved live-stream destinations (RTMP server + stream key) per user. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("streamTargets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("streamTargets")),
    platform: streamPlatformValidator,
    label: v.string(),
    rtmpUrl: v.string(),
    streamKey: v.string(),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const { id, ...patch } = args;

    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing || existing.userId !== user._id) {
        throw new Error("Stream target not found");
      }
      await ctx.db.patch(id, {
        platform: patch.platform,
        label: patch.label.trim(),
        rtmpUrl: patch.rtmpUrl.trim(),
        streamKey: patch.streamKey.trim(),
        enabled: patch.enabled ?? existing.enabled,
      });
      return id;
    }

    return await ctx.db.insert("streamTargets", {
      userId: user._id,
      platform: patch.platform,
      label: patch.label.trim() || patch.platform,
      rtmpUrl: patch.rtmpUrl.trim(),
      streamKey: patch.streamKey.trim(),
      enabled: patch.enabled ?? true,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("streamTargets") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== user._id) {
      throw new Error("Stream target not found");
    }
    await ctx.db.patch(id, { enabled: !existing.enabled });
    return !existing.enabled;
  },
});

export const remove = mutation({
  args: { id: v.id("streamTargets") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== user._id) {
      throw new Error("Stream target not found");
    }
    await ctx.db.delete(id);
    return true;
  },
});
