import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("transcripts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    sourceText: v.string(),
    verses: v.array(
      v.object({
        reference: v.string(),
        text: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    return await ctx.db.insert("transcripts", {
      userId: user._id,
      title: args.title.trim() || "Untitled transcript",
      sourceText: args.sourceText,
      verses: args.verses,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("transcripts") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const t = await ctx.db.get(id);
    if (!t || t.userId !== user._id) throw new Error("Transcript not found");
    await ctx.db.delete(id);
    return true;
  },
});
