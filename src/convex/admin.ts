import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { ROLES, roleValidator } from "./schema";

const getAdmin = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not signed in");
  if (user.role !== ROLES.ADMIN) throw new Error("Admin access required");
  return user;
};

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user?.role === ROLES.ADMIN;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== ROLES.ADMIN) return null;
    const [users, items, services, subscriptions, transcripts] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("catalogItems").collect(),
        ctx.db.query("services").collect(),
        ctx.db.query("subscriptions").collect(),
        ctx.db.query("transcripts").collect(),
      ]);
    return {
      users: users.length,
      items: items.length,
      pendingItems: items.filter((i) => !i.isApproved).length,
      downloads: items.reduce((sum, i) => sum + i.downloads, 0),
      services: services.length,
      proSubs: subscriptions.filter(
        (s) => s.plan === "pro" && s.status !== "canceled",
      ).length,
      transcripts: transcripts.length,
    };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== ROLES.ADMIN) return [];
    const [users, subs] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("subscriptions").collect(),
    ]);
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role ?? ROLES.USER,
      isAnonymous: u.isAnonymous ?? false,
      _creationTime: u._creationTime,
      plan: subs.find((s) => s.userId === u._id)?.plan ?? "free",
    }));
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    await getAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
    return true;
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== ROLES.ADMIN) return [];
    const items = await ctx.db.query("catalogItems").collect();
    return items.filter((i) => !i.isApproved);
  },
});

export const setApproval = mutation({
  args: { id: v.id("catalogItems"), approved: v.boolean() },
  handler: async (ctx, args) => {
    await getAdmin(ctx);
    await ctx.db.patch(args.id, { isApproved: args.approved });
    return true;
  },
});
