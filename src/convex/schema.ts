import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// --- User roles ---------------------------------------------------------------

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
);
export type Role = Infer<typeof roleValidator>;

// --- Gender -------------------------------------------------------------------

export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  NON_BINARY: "non_binary",
  OTHER: "other",
} as const;
export const genderValidator = v.union(
  v.literal(GENDER.MALE),
  v.literal(GENDER.FEMALE),
  v.literal(GENDER.NON_BINARY),
  v.literal(GENDER.OTHER),
);
export type Gender = Infer<typeof genderValidator>;

// --- Report status ------------------------------------------------------------

export const REPORT_STATUS = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
} as const;
export const reportStatusValidator = v.union(
  ...Object.values(REPORT_STATUS).map((s) => v.literal(s)),
);

// --- Livestream status --------------------------------------------------------

export const STREAM_STATUS = {
  LIVE: "live",
  ENDED: "ended",
  SCHEDULED: "scheduled",
} as const;
export const streamStatusValidator = v.union(
  ...Object.values(STREAM_STATUS).map((s) => v.literal(s)),
);

// --- Gift types ---------------------------------------------------------------

export const GIFT_TYPE = {
  ROSE: "rose",
  HEART: "heart",
  DIAMOND: "diamond",
  CROWN: "crown",
  FIRE: "fire",
  STAR: "star",
} as const;
export const giftTypeValidator = v.union(
  ...Object.values(GIFT_TYPE).map((g) => v.literal(g)),
);
export type GiftType = Infer<typeof giftTypeValidator>;

// --- Coin packages ------------------------------------------------------------

export const COIN_PACKAGE = {
  STARTER: "starter",
  POPULAR: "popular",
  PREMIUM: "premium",
  MEGA: "mega",
} as const;
export const coinPackageValidator = v.union(
  ...Object.values(COIN_PACKAGE).map((p) => v.literal(p)),
);

// --- Subscription plans -------------------------------------------------------

export const SUB_PLAN = {
  FREE: "free",
  SILVER: "silver",
  GOLD: "gold",
  DIAMOND: "diamond",
} as const;
export const subPlanValidator = v.union(
  ...Object.values(SUB_PLAN).map((p) => v.literal(p)),
);
export type SubPlan = Infer<typeof subPlanValidator>;

export const SUB_STATUS = {
  NONE: "none",
  ACTIVE: "active",
  PAST_DUE: "past_dued",
  CANCELED: "canceled",
} as const;
export const subStatusValidator = v.union(
  ...Object.values(SUB_STATUS).map((s) => v.literal(s)),
);

// ==============================================================================
// Schema
// ==============================================================================

const schema = defineSchema(
  {
    // Default auth tables from Convex Auth — DO NOT remove
    ...authTables,

    // --- User profiles (extends auth users) -----------------------------------
    profiles: defineTable({
      userId: v.id("users"),
      bio: v.optional(v.string()),
      age: v.optional(v.number()),
      gender: v.optional(genderValidator),
      country: v.optional(v.string()),
      city: v.optional(v.string()),
      interests: v.array(v.string()),
      photos: v.array(v.string()), // array of image URLs
      lookingFor: v.optional(v.string()),
      isOnline: v.boolean(),
      lastSeen: v.number(),
      isVerified: v.boolean(),
      isBanned: v.boolean(),
      coins: v.number(),
      followersCount: v.number(),
      followingCount: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_country", ["country"])
      .index("by_gender", ["gender"]),

    // --- Likes (swipe right) -------------------------------------------------
    likes: defineTable({
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
    })
      .index("by_from", ["fromUserId"])
      .index("by_to", ["toUserId"])
      .index("by_from_and_to", ["fromUserId", "toUserId"]),

    // --- Passes (swipe left) -------------------------------------------------
    passes: defineTable({
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
    })
      .index("by_from", ["fromUserId"])
      .index("by_from_and_to", ["fromUserId", "toUserId"]),

    // --- Matches (mutual likes) ----------------------------------------------
    matches: defineTable({
      user1: v.id("users"),
      user2: v.id("users"),
      isUnreadByUser1: v.boolean(),
      isUnreadByUser2: v.boolean(),
    })
      .index("by_user1", ["user1"])
      .index("by_user2", ["user2"]),

    // --- Messages (private chat) ---------------------------------------------
    messages: defineTable({
      matchId: v.id("matches"),
      senderId: v.id("users"),
      text: v.string(),
      imageUrl: v.optional(v.string()),
      isRead: v.boolean(),
    })
      .index("by_match", ["matchId"])
      .index("by_sender", ["senderId"]),

    // --- Follows -------------------------------------------------------------
    follows: defineTable({
      followerId: v.id("users"),
      followingId: v.id("users"),
    })
      .index("by_follower", ["followerId"])
      .index("by_following", ["followingId"])
      .index("by_follower_and_following", ["followerId", "followingId"]),

    // --- Live streams --------------------------------------------------------
    livestreams: defineTable({
      hostId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      country: v.string(),
      city: v.optional(v.string()),
      status: streamStatusValidator,
      viewerCount: v.number(),
      peakViewers: v.number(),
      totalCoinsReceived: v.number(),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      tags: v.array(v.string()),
    })
      .index("by_status", ["status"])
      .index("by_host", ["hostId"])
      .index("by_country", ["country"])
      .index("by_country_and_status", ["country", "status"]),

    // --- Livestream comments -------------------------------------------------
    streamComments: defineTable({
      livestreamId: v.id("livestreams"),
      userId: v.id("users"),
      text: v.string(),
    })
      .index("by_livestream", ["livestreamId"]),

    // --- Gifts sent during livestreams ----------------------------------------
    streamGifts: defineTable({
      livestreamId: v.id("livestreams"),
      senderId: v.id("users"),
      giftType: giftTypeValidator,
      coinsSpent: v.number(),
    })
      .index("by_livestream", ["livestreamId"]),

    // --- Coin transactions ---------------------------------------------------
    coinTransactions: defineTable({
      userId: v.id("users"),
      amount: v.number(),
      type: v.union(v.literal("purchase"), v.literal("gift_sent"), v.literal("gift_received"), v.literal("subscription_reward")),
      description: v.string(),
    })
      .index("by_user", ["userId"]),

    // --- Subscriptions -------------------------------------------------------
    subscriptions: defineTable({
      userId: v.id("users"),
      plan: subPlanValidator,
      status: subStatusValidator,
      currentPeriodEnd: v.optional(v.number()),
      providerCustomerId: v.optional(v.string()),
      providerSubscriptionId: v.optional(v.string()),
    })
      .index("by_user", ["userId"]),

    // --- Reports -------------------------------------------------------------
    reports: defineTable({
      reporterId: v.id("users"),
      reportedUserId: v.id("users"),
      reason: v.string(),
      description: v.optional(v.string()),
      status: reportStatusValidator,
    })
      .index("by_reporter", ["reporterId"])
      .index("by_reported", ["reportedUserId"])
      .index("by_status", ["status"]),

    // --- Block list ----------------------------------------------------------
    blocks: defineTable({
      blockerId: v.id("users"),
      blockedId: v.id("users"),
    })
      .index("by_blocker", ["blockerId"])
      .index("by_blocked", ["blockedId"])
      .index("by_blocker_and_blocked", ["blockerId", "blockedId"]),

    // --- Leaderboard points --------------------------------------------------
    leaderboardEntries: defineTable({
      userId: v.id("users"),
      points: v.number(),
      period: v.string(), // e.g. "2026-08" or "all-time"
      rank: v.number(),
    })
      .index("by_period_and_points", ["period", "points"])
      .index("by_user_and_period", ["userId", "period"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
