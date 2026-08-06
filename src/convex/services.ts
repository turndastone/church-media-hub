import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { serviceItemTypeValidator, serviceStatusValidator } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const service = await ctx.db.get(id);
    if (!service || service.userId !== user._id) return null;
    return service;
  },
});

export const create = mutation({
  args: { title: v.string(), date: v.number(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    return await ctx.db.insert("services", {
      userId: user._id,
      title: args.title.trim(),
      date: args.date,
      status: "draft",
      items: [],
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("services"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    status: v.optional(serviceStatusValidator),
    notes: v.optional(v.string()),
    items: v.optional(
      v.array(
        v.object({
          label: v.string(),
          type: serviceItemTypeValidator,
          content: v.optional(v.string()),
          reference: v.optional(v.string()),
          catalogItemId: v.optional(v.id("catalogItems")),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const service = await ctx.db.get(args.id);
    if (!service || service.userId !== user._id) throw new Error("Service not found");
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const service = await ctx.db.get(id);
    if (!service || service.userId !== user._id) throw new Error("Service not found");
    await ctx.db.delete(id);
    return true;
  },
});
