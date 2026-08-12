import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import {
  churchSocialValidator,
  PROGRAM_CATEGORY,
  programCategoryValidator,
} from "./schema";

// ─── Seed data (RCCG Solution Ambassador) ───────────────────────────────────

export const DEFAULT_INFO = {
  name: "RCCG Solution Ambassador",
  tagline: "A Parish of the Redeemed Christian Church of God",
  description:
    "RCCG Solution Ambassador is a vibrant, Christ-centred parish of the Redeemed Christian Church of God. We exist to raise kingdom ambassadors who carry practical, godly solutions into their homes, workplaces, schools, and communities — through fervent prayer, sound teaching, and purposeful worship.",
  welcomeMessage:
    "Welcome to RCCG Solution Ambassador! We are glad you found us. 🙏 Explore our service times and programs below, or simply ask me anything about the church — our location, weekly programs, contact details, and more. God bless you!",
  verse:
    "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not. — Jeremiah 33:3",
  address: "12 Solution Way, Off Redemption Avenue, Lagos, Nigeria",
  phones: ["+234 801 234 5678", "+234 901 234 5678"],
  emails: ["info@rccgsolutionambassador.org"],
  socials: [
    { platform: "facebook", url: "https://facebook.com/rccgsolutionambassador" },
    { platform: "youtube", url: "https://youtube.com/@rccgsolutionambassador" },
    { platform: "instagram", url: "https://instagram.com/rccgsolutionambassador" },
    { platform: "x", url: "https://x.com/rccg_solution" },
    { platform: "tiktok", url: "https://tiktok.com/@rccgsolutionambassador" },
    { platform: "whatsapp", url: "https://wa.me/2348012345678" },
  ],
};

const SEED_PROGRAMS = [
  {
    title: "Morning Dew Prayer",
    description:
      "Start the day with intercession, worship, and the Word before heading out into the world.",
    category: PROGRAM_CATEGORY.DAILY,
    day: "Monday – Saturday",
    time: "5:00 – 6:00 AM",
    venue: "Main Auditorium & Online",
    order: 1,
    isActive: true,
  },
  {
    title: "Open Heavens — Daily Devotional",
    description:
      "A daily devotional encounter with God, led by our pastors and shared across our social platforms.",
    category: PROGRAM_CATEGORY.DAILY,
    day: "Every day",
    time: "6:00 AM",
    venue: "Online",
    order: 2,
    isActive: true,
  },
  {
    title: "Midnight Prayer",
    description:
      "Fervent midnight intercession for the family, the church, and the nation.",
    category: PROGRAM_CATEGORY.DAILY,
    day: "Every day",
    time: "12:00 AM",
    venue: "Prayer Altar",
    order: 3,
    isActive: true,
  },
  {
    title: "Sunday School",
    description:
      "Foundational Bible teaching for all ages before the main worship service.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Sundays",
    time: "7:30 – 8:30 AM",
    venue: "Classrooms",
    order: 1,
    isActive: true,
  },
  {
    title: "Sunday Worship Service",
    description:
      "An atmosphere of praise, worship, and the undiluted Word of God for the whole family.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Sundays",
    time: "8:30 AM – 12:00 PM",
    venue: "Main Auditorium",
    order: 2,
    isActive: true,
  },
  {
    title: "Bible Study",
    description:
      "Deep, interactive study of the scriptures led by our ministers.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Tuesdays",
    time: "5:00 – 6:30 PM",
    venue: "Main Auditorium",
    order: 3,
    isActive: true,
  },
  {
    title: "Digging Deep (Faith Clinic)",
    description:
      "A practical teaching session that turns the Word into workable solutions for everyday life.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Thursdays",
    time: "5:00 – 6:30 PM",
    venue: "Main Auditorium",
    order: 4,
    isActive: true,
  },
  {
    title: "Prayer & Deliverance",
    description:
      "A night of intense prayer, praise, and ministration for breakthrough.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Fridays",
    time: "6:00 – 8:00 PM",
    venue: "Main Auditorium",
    order: 5,
    isActive: true,
  },
  {
    title: "Solution Youths Fellowship",
    description:
      "A lively gathering for young people — worship, mentorship, and growth.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Saturdays",
    time: "4:00 – 6:00 PM",
    venue: "Youth Hall",
    order: 6,
    isActive: true,
  },
  {
    title: "Holy Ghost Service",
    description:
      "A power-packed monthly service of worship and ministration hosted by the parish.",
    category: PROGRAM_CATEGORY.MONTHLY,
    day: "First Friday of the month",
    time: "6:00 PM – Midnight",
    venue: "Main Auditorium",
    order: 1,
    isActive: true,
  },
  {
    title: "Thanksgiving Service",
    description:
      "A special Sunday of testimonies and gratitude for God's faithfulness.",
    category: PROGRAM_CATEGORY.MONTHLY,
    day: "First Sunday of the month",
    time: "8:30 AM – 12:00 PM",
    venue: "Main Auditorium",
    order: 2,
    isActive: true,
  },
  {
    title: "Monthly Fasting & Prayer",
    description:
      "Corporate fasting and prayer for the church, families, and the nation.",
    category: PROGRAM_CATEGORY.MONTHLY,
    day: "Last Saturday of the month",
    time: "8:00 AM – 12:00 PM",
    venue: "Prayer Altar",
    order: 3,
    isActive: true,
  },
  {
    title: "Provincial Convention",
    description:
      "Annual gathering of all parishes in the province for worship, teaching, and miracles.",
    category: PROGRAM_CATEGORY.PROVINCIAL,
    day: "Annually · July",
    time: "All week",
    venue: "Provincial Headquarters",
    order: 1,
    isActive: true,
  },
  {
    title: "Provincial Youth Convention",
    description:
      "A week-long programme for young ambassadors across the province.",
    category: PROGRAM_CATEGORY.PROVINCIAL,
    day: "Annually · August",
    time: "All week",
    venue: "Provincial Headquarters",
    order: 2,
    isActive: true,
  },
  {
    title: "Provincial Ministers' Conference",
    description:
      "Equipping ministers and workers across the province for greater effectiveness.",
    category: PROGRAM_CATEGORY.PROVINCIAL,
    day: "Quarterly",
    time: "9:00 AM – 4:00 PM",
    venue: "Provincial Headquarters",
    order: 3,
    isActive: true,
  },
  {
    title: "Provincial Choir & Music Festival",
    description:
      "A celebration of praise as choirs from every parish minister together.",
    category: PROGRAM_CATEGORY.PROVINCIAL,
    day: "Annually · December",
    time: "5:00 PM",
    venue: "Provincial Headquarters",
    order: 4,
    isActive: true,
  },
];

// ─── Queries ────────────────────────────────────────────────────────────────

/** Public: the single church profile record, or null before seeding. */
export const getInfo = query({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("churchInfo").first()) ?? null;
  },
});

/** Public: active programs, ordered by category + display order. */
export const listPrograms = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("programs").collect();
    const orderOf = {
      [PROGRAM_CATEGORY.DAILY]: 0,
      [PROGRAM_CATEGORY.WEEKLY]: 1,
      [PROGRAM_CATEGORY.MONTHLY]: 2,
      [PROGRAM_CATEGORY.PROVINCIAL]: 3,
    };
    return all
      .filter((p) => p.isActive)
      .sort(
        (a, b) =>
          orderOf[a.category] - orderOf[b.category] ||
          a.order - b.order ||
          a._creationTime - b._creationTime,
      );
  },
});

/** Signed-in only: every program including inactive ones (admin view). */
export const listAllPrograms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const all = await ctx.db.query("programs").collect();
    return all.sort((a, b) => a.order - b.order || a._creationTime - b._creationTime);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Idempotent, public: seeds the church profile and starter programs. */
export const ensureSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const existingInfo = await ctx.db.query("churchInfo").first();
    if (!existingInfo) {
      await ctx.db.insert("churchInfo", { ...DEFAULT_INFO, updatedAt: Date.now() });
    }
    const programs = await ctx.db.query("programs").collect();
    if (programs.length === 0) {
      for (const p of SEED_PROGRAMS) {
        await ctx.db.insert("programs", p);
      }
    }
    return true;
  },
});

/** Signed-in: update the church profile. */
export const saveInfo = mutation({
  args: {
    name: v.string(),
    tagline: v.string(),
    description: v.string(),
    welcomeMessage: v.string(),
    verse: v.string(),
    address: v.string(),
    phones: v.array(v.string()),
    emails: v.array(v.string()),
    socials: v.array(churchSocialValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const info = await ctx.db.query("churchInfo").first();
    const patch = { ...args, updatedAt: Date.now() };
    if (info) {
      await ctx.db.patch(info._id, patch);
      return info._id;
    }
    return await ctx.db.insert("churchInfo", patch);
  },
});

/** Signed-in: create a program. */
export const createProgram = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: programCategoryValidator,
    day: v.string(),
    time: v.string(),
    venue: v.optional(v.string()),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    return await ctx.db.insert("programs", {
      title: args.title.trim(),
      description: args.description.trim(),
      category: args.category,
      day: args.day.trim(),
      time: args.time.trim(),
      venue: args.venue?.trim() || undefined,
      order: args.order,
      isActive: args.isActive,
    });
  },
});

/** Signed-in: update a program. */
export const updateProgram = mutation({
  args: {
    id: v.id("programs"),
    title: v.string(),
    description: v.string(),
    category: programCategoryValidator,
    day: v.string(),
    time: v.string(),
    venue: v.optional(v.string()),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const program = await ctx.db.get(args.id);
    if (!program) throw new Error("Program not found");
    const { id, ...patch } = args;
    await ctx.db.patch(id, {
      title: patch.title.trim(),
      description: patch.description.trim(),
      category: patch.category,
      day: patch.day.trim(),
      time: patch.time.trim(),
      venue: patch.venue?.trim() || undefined,
      order: patch.order,
      isActive: patch.isActive,
    });
    return id;
  },
});

/** Signed-in: delete a program. */
export const deleteProgram = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const program = await ctx.db.get(id);
    if (!program) throw new Error("Program not found");
    await ctx.db.delete(id);
    return true;
  },
});
