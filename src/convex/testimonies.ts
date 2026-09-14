import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { ROLES } from "./schema";

const getSignedInUser = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not signed in");
  return user;
};

const getAdmin = async (ctx: QueryCtx) => {
  const user = await getSignedInUser(ctx);
  if (user.role !== ROLES.ADMIN) throw new Error("Admin access required");
  return user;
};

/** Member submits a testimony. It stays private until an admin approves it. */
export const add = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const user = await getSignedInUser(ctx);
    const title = args.title.trim().slice(0, 140);
    const body = args.body.trim().slice(0, 4000);
    if (!title) throw new Error("Please add a short title for your testimony.");
    if (!body) throw new Error("Please write your testimony.");
    await ctx.db.insert("testimonies", {
      userId: user._id,
      title,
      body,
      isApproved: false,
    });
    return true;
  },
});

/** Public: approved testimonies with their authors, newest first. */
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("testimonies")
      .withIndex("by_approved", (q) => q.eq("isApproved", true))
      .order("desc")
      .take(50);
    return Promise.all(
      rows.map(async (t) => ({
        _id: t._id,
        title: t.title,
        body: t.body,
        _creationTime: t._creationTime,
        author: await ctx.db.get(t.userId),
      })),
    );
  },
});

/** The signed-in member's own testimonies. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getSignedInUser(ctx);
    return ctx.db
      .query("testimonies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

/** Member removes one of their own testimonies. */
export const removeMine = mutation({
  args: { id: v.id("testimonies") },
  handler: async (ctx, args) => {
    const user = await getSignedInUser(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Testimony not found");
    if (doc.userId !== user._id && user.role !== ROLES.ADMIN) {
      throw new Error("You can only remove your own testimonies");
    }
    await ctx.db.delete(args.id);
    return true;
  },
});

/** Admin: every testimony (newest first) with author info for review. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== ROLES.ADMIN) return [];
    const rows = await ctx.db.query("testimonies").order("desc").take(200);
    return Promise.all(
      rows.map(async (t) => ({
        _id: t._id,
        title: t.title,
        body: t.body,
        isApproved: t.isApproved,
        _creationTime: t._creationTime,
        author: await ctx.db.get(t.userId),
      })),
    );
  },
});

/** Admin: publish or unpublish a testimony. */
export const setApproved = mutation({
  args: { id: v.id("testimonies"), approved: v.boolean() },
  handler: async (ctx, args) => {
    await getAdmin(ctx);
    await ctx.db.patch(args.id, { isApproved: args.approved });
    return true;
  },
});

/** Admin: permanently remove a testimony. */
export const remove = mutation({
  args: { id: v.id("testimonies") },
  handler: async (ctx, args) => {
    await getAdmin(ctx);
    await ctx.db.delete(args.id);
    return true;
  },
});

// Demo testimonies seeded once so the testimonies section feels alive on first
// visit. Safe to run repeatedly — it no-ops as soon as any testimony exists.
const DEMO = [
  {
    name: "Nana Adwoa",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    title: "God restored my family",
    body:
      "For months my marriage felt hopeless. I joined the church barely able to pray, but the intercession group held me up. Today my husband and I serve together — God truly restored what the enemy tried to steal.",
    approved: true,
  },
  {
    name: "Kwame Mensah",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Provision in the dry season",
    body:
      "I lost my job in January and owed rent by March. I kept attending Digging Deep and trusting the Word. Within weeks, a contractor I had not spoken to in years offered me work. Jehovah Jireh showed up for my whole family.",
    approved: true,
  },
  {
    name: "Ama Serwaa",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Healed at the thanksgiving service",
    body:
      "Doctors said I needed surgery for a growth I had carried for over a year. During the monthly thanksgiving service I was prayed for, and when I went back for the scan, it was gone. I give God all the glory!",
    approved: true,
  },
  {
    name: "Kojo Asante",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    title: "My final year results",
    body:
      "My grades were below the pass mark and I had no hope of graduating. The youth fellowship prayed with me every week, and my resit results came back as a first-class pass. Nothing is impossible with God.",
    approved: false,
  },
];

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await getSignedInUser(ctx);
    const existing = await ctx.db.query("testimonies").take(1);
    if (existing.length > 0) return false;
    await Promise.all(
      DEMO.map(async (d) => {
        const userId = await ctx.db.insert("users", {
          name: d.name,
          image: d.image,
        });
        await ctx.db.insert("testimonies", {
          userId,
          title: d.title,
          body: d.body,
          isApproved: d.approved,
        });
      }),
    );
    return true;
  },
});