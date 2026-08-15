import { mutation, query, type QueryCtx } from "./_generated/server";
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
  address: "Ankwa Dobro, Radiance fuel station, opposite Fet-Power, Nsawam, Ghana",
  website: "",
  phones: ["+233 23 822 2901", "+233 24 601 0017"],
  emails: ["rccgsolutionambassador@gmail.com"],
  socials: [
    { platform: "facebook", url: "https://www.facebook.com/61560761229546" },
    { platform: "youtube", url: "https://youtu.be/6UrnmOc3kSQ" },
    { platform: "whatsapp", url: "https://wa.me/233238222901" },
  ],
};

// Invented social accounts seeded before the real handles were known — removed
// from the live site so visitors never land on 404 pages.
const REMOVED_SOCIAL_URLS = [
  "https://instagram.com/rccgsolutionambassador",
  "https://x.com/rccg_solution",
  "https://tiktok.com/@rccgsolutionambassador",
];

// Placeholder contact details shipped before the real ones were known.
const OLD_PLACEHOLDER_ADDRESS =
  "12 Solution Way, Off Redemption Avenue, Lagos, Nigeria";
const OLD_PLACEHOLDER_PHONE = "+234 801 234 5678";
const OLD_PLACEHOLDER_EMAIL = "info@rccgambghana.org"; // interim provincial-HQ email

// Official RCCG Solution Ambassadors service schedule.
const SEED_PROGRAMS = [
  {
    title: "Sunday Service",
    description:
      "A glorious time of praise, worship, and the undiluted Word of God for the whole family.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Every Sunday",
    time: "8:00 AM – 11:00 AM",
    venue: "Dobro",
    order: 1,
    isActive: true,
  },
  {
    title: "Digging Deep",
    description:
      "Deep, interactive study of the scriptures led by our ministers.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Every Tuesday",
    time: "6:00 PM – 7:00 PM",
    venue: "Dobro",
    order: 2,
    isActive: true,
  },
  {
    title: "Faith Clinic",
    description:
      "Practical teaching that turns the Word into workable solutions for everyday life.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Every Thursday",
    time: "6:00 PM – 7:00 PM",
    venue: "Dobro",
    order: 3,
    isActive: true,
  },
  {
    title: "Youth Sunday",
    description:
      "A special Sunday when the youths lead and minister during the main service.",
    category: PROGRAM_CATEGORY.WEEKLY,
    day: "Every Third Sunday",
    time: "During Sunday Service",
    venue: "Dobro",
    order: 4,
    isActive: true,
  },
  {
    title: "Communion Service",
    description:
      "A reverent service of Holy Communion and thanksgiving.",
    category: PROGRAM_CATEGORY.MONTHLY,
    day: "First Sunday of Every Month",
    time: "5:00 PM",
    venue: "Ambassadors, Labadi Trade Fair, LA",
    order: 1,
    isActive: true,
  },
  {
    title: "Begin the Month with the Lord",
    description:
      "Start the month right with early morning prayer and praise.",
    category: PROGRAM_CATEGORY.MONTHLY,
    day: "First Tuesday of Every Month",
    time: "6:00 AM – 7:00 AM",
    venue: "Dobro",
    order: 2,
    isActive: true,
  },
  {
    title: "Night Vigil",
    description:
      "A powerful night of prayer, praise, and ministration for breakthrough.",
    category: PROGRAM_CATEGORY.MONTHLY,
    day: "Second Friday of Every Month",
    time: "10:00 PM – 1:00 AM",
    venue: "Dobro",
    order: 3,
    isActive: true,
  },
  {
    title: "Provincial Vigil",
    description:
      "A province-wide night vigil hosted at the provincial headquarters.",
    category: PROGRAM_CATEGORY.PROVINCIAL,
    day: "Last Friday of Every Month",
    time: "10:00 PM – 1:00 AM",
    venue: "Ambassadors, Labadi Trade Fair, LA",
    order: 1,
    isActive: true,
  },
];

// Titles from the placeholder schedule that shipped before the real one.
const OLD_SEED_TITLES = [
  "Morning Dew Prayer",
  "Open Heavens — Daily Devotional",
  "Midnight Prayer",
  "Sunday School",
  "Sunday Worship Service",
  "Bible Study",
  "Digging Deep (Faith Clinic)",
  "Prayer & Deliverance",
  "Solution Youths Fellowship",
  "Holy Ghost Service",
  "Thanksgiving Service",
  "Monthly Fasting & Prayer",
  "Provincial Convention",
  "Provincial Youth Convention",
  "Provincial Ministers' Conference",
  "Provincial Choir & Music Festival",
];

/** Church content editors must be signed in with a real account — guests can't edit. */
const getEditor = async (ctx: QueryCtx) => {
  const user = await getCurrentUser(ctx);
  if (!user || user.isAnonymous) {
    throw new Error("Sign in with an email to manage church content.");
  }
  return user;
};

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

/** Signed-in, non-guest only: every program including inactive ones (admin view). */
export const listAllPrograms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAnonymous) return [];
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
    } else {
      const hasPlaceholderContact =
        existingInfo.address === OLD_PLACEHOLDER_ADDRESS ||
        existingInfo.phones.includes(OLD_PLACEHOLDER_PHONE) ||
        existingInfo.emails.includes(OLD_PLACEHOLDER_EMAIL) ||
        // Previous published contact email, superseded by the official address.
        existingInfo.emails.includes("princetetteh355@gmail.com") ||
        // Email shown on the earlier Canva site before the official one was chosen.
        existingInfo.emails.includes("rccgsolutionambassadors@gmail.com");
      if (hasPlaceholderContact) {
        // One-time migration: replace placeholder contact details with the real ones.
        await ctx.db.patch(existingInfo._id, {
          address: DEFAULT_INFO.address,
          phones: DEFAULT_INFO.phones,
          emails: DEFAULT_INFO.emails,
          socials: DEFAULT_INFO.socials,
          website: DEFAULT_INFO.website,
          updatedAt: Date.now(),
        });
      } else {
        // One-time migration: drop social links to accounts that don't exist.
        const cleanedSocials = (existingInfo.socials ?? []).filter(
          (s) => !REMOVED_SOCIAL_URLS.includes(s.url),
        );
        if (cleanedSocials.length !== (existingInfo.socials ?? []).length) {
          await ctx.db.patch(existingInfo._id, {
            socials: cleanedSocials,
            updatedAt: Date.now(),
          });
        }
      }
      if (existingInfo.website) {
        // One-time removal: the public website link was taken down.
        await ctx.db.patch(existingInfo._id, {
          website: "",
          updatedAt: Date.now(),
        });
      }
    }
    const programs = await ctx.db.query("programs").collect();

    // One-time migration: replace the old placeholder schedule with the real one.
    const hasOldSeed = programs.some((p) => OLD_SEED_TITLES.includes(p.title));
    if (hasOldSeed) {
      for (const p of programs) {
        await ctx.db.delete(p._id);
      }
    }

    if (hasOldSeed || programs.length === 0) {
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
    website: v.optional(v.string()),
    phones: v.array(v.string()),
    emails: v.array(v.string()),
    socials: v.array(churchSocialValidator),
  },
  handler: async (ctx, args) => {
    await getEditor(ctx);
    const info = await ctx.db.query("churchInfo").first();
    const { website, ...rest } = args;
    const patch = {
      ...rest,
      ...(website && website.trim() ? { website: website.trim() } : {}),
      updatedAt: Date.now(),
    };
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
    await getEditor(ctx);
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
    await getEditor(ctx);
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
    await getEditor(ctx);
    const program = await ctx.db.get(id);
    if (!program) throw new Error("Program not found");
    await ctx.db.delete(id);
    return true;
  },
});
