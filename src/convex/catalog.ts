import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { DEMO_ITEMS } from "./catalogSeed";
import { itemTypeValidator, ROLES } from "./schema";

export const list = query({
  args: {
    q: v.optional(v.string()),
    type: v.optional(itemTypeValidator),
    tag: v.optional(v.string()),
    scope: v.optional(v.union(v.literal("all"), v.literal("mine"))),
  },
  handler: async (ctx, { q, type, tag, scope }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const all = await ctx.db.query("catalogItems").collect();
    const ql = q?.trim().toLowerCase();
    return all
      .filter((item) => {
        const mine = item.userId === user._id;
        if (scope === "mine" && !mine) return false;
        if (scope !== "mine" && !item.isPublic && !mine) return false;
        if (type && item.type !== type) return false;
        if (tag && !item.tags.includes(tag)) return false;
        if (ql) {
          const haystack = `${item.title} ${item.artist ?? ""} ${item.reference ?? ""} ${item.tags.join(" ")} ${item.body ?? ""}`.toLowerCase();
          if (!haystack.includes(ql)) return false;
        }
        return true;
      })
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const get = query({
  args: { id: v.id("catalogItems") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const item = await ctx.db.get(id);
    if (!item) return null;
    if (!item.isPublic && item.userId !== user._id) return null;
    return item;
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const create = mutation({
  args: {
    type: itemTypeValidator,
    title: v.string(),
    body: v.optional(v.string()),
    reference: v.optional(v.string()),
    artist: v.optional(v.string()),
    tags: v.array(v.string()),
    coverUrl: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    accent: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const id = await ctx.db.insert("catalogItems", {
      userId: user._id,
      type: args.type,
      title: args.title.trim(),
      body: args.body?.trim() || undefined,
      reference: args.reference?.trim() || undefined,
      artist: args.artist?.trim() || undefined,
      tags: args.tags.map((t) => t.trim()).filter(Boolean),
      coverUrl: args.coverUrl?.trim() || undefined,
      coverStorageId: args.coverStorageId,
      accent: args.accent,
      isPublic: args.isPublic,
      isApproved: user.role === ROLES.ADMIN,
      downloads: 0,
      likedBy: [],
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("catalogItems"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    reference: v.optional(v.string()),
    artist: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    coverUrl: v.optional(v.string()),
    accent: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    if (item.userId !== user._id && user.role !== ROLES.ADMIN) {
      throw new Error("You can only edit your own content");
    }
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("catalogItems") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item not found");
    if (item.userId !== user._id && user.role !== ROLES.ADMIN) {
      throw new Error("You can only delete your own content");
    }
    await ctx.db.delete(id);
    return true;
  },
});

export const toggleLike = mutation({
  args: { id: v.id("catalogItems") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item not found");
    const liked = item.likedBy.includes(user._id);
    await ctx.db.patch(id, {
      likedBy: liked
        ? item.likedBy.filter((uid) => uid !== user._id)
        : [...item.likedBy, user._id],
    });
    return !liked;
  },
});

export const incrementDownload = mutation({
  args: { id: v.id("catalogItems") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item not found");
    await ctx.db.patch(id, { downloads: item.downloads + 1 });
    return item.downloads + 1;
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");

    // First user in a fresh deployment becomes the admin.
    const allUsers = await ctx.db.query("users").collect();
    if (!allUsers.some((u) => u.role === ROLES.ADMIN)) {
      await ctx.db.patch(user._id, { role: ROLES.ADMIN });
    }

    const existing = await ctx.db
      .query("catalogItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) return false;

    for (const item of DEMO_ITEMS) {
      await ctx.db.insert("catalogItems", {
        userId: user._id,
        type: item.type,
        title: item.title,
        body: item.body,
        reference: item.reference,
        artist: item.artist,
        tags: item.tags,
        accent: item.accent,
        isPublic: true,
        isApproved: true,
        downloads: item.downloads,
        likedBy: [],
      });
    }
    return true;
  },
});
