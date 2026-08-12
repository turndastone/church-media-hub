import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// --- Billing ----------------------------------------------------------------

export const PLAN = {
  FREE: "free",
  PRO: "pro",
} as const;
export const planValidator = v.union(v.literal(PLAN.FREE), v.literal(PLAN.PRO));

export const SUB_STATUS = {
  NONE: "none",
  PENDING: "pending",
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
} as const;
export const subStatusValidator = v.union(
  ...Object.values(SUB_STATUS).map((s) => v.literal(s)),
);

export const BILLING_PROVIDER = {
  STRIPE: "stripe",
  PAYSTACK: "paystack",
} as const;
export const billingProviderValidator = v.union(
  v.literal(BILLING_PROVIDER.STRIPE),
  v.literal(BILLING_PROVIDER.PAYSTACK),
);

// --- Content catalog --------------------------------------------------------

export const ITEM_TYPE = {
  SONG: "song",
  SCRIPTURE: "scripture",
  BACKGROUND: "background",
  TEMPLATE: "template",
} as const;
export const itemTypeValidator = v.union(
  v.literal(ITEM_TYPE.SONG),
  v.literal(ITEM_TYPE.SCRIPTURE),
  v.literal(ITEM_TYPE.BACKGROUND),
  v.literal(ITEM_TYPE.TEMPLATE),
);
export type ItemType = Infer<typeof itemTypeValidator>;

export const SERVICE_ITEM_TYPE = {
  ...ITEM_TYPE,
  NOTE: "note",
} as const;
export const serviceItemTypeValidator = v.union(
  v.literal(SERVICE_ITEM_TYPE.SONG),
  v.literal(SERVICE_ITEM_TYPE.SCRIPTURE),
  v.literal(SERVICE_ITEM_TYPE.BACKGROUND),
  v.literal(SERVICE_ITEM_TYPE.TEMPLATE),
  v.literal(SERVICE_ITEM_TYPE.NOTE),
);

export const SERVICE_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  LIVE: "live",
  COMPLETED: "completed",
} as const;
export const serviceStatusValidator = v.union(
  v.literal(SERVICE_STATUS.DRAFT),
  v.literal(SERVICE_STATUS.SCHEDULED),
  v.literal(SERVICE_STATUS.LIVE),
  v.literal(SERVICE_STATUS.COMPLETED),
);

// --- Desktop integrations ---------------------------------------------------

export const APP = {
  OBS: "obs",
  EASYWORSHIP: "easyworship",
  PEWBEAM: "pewbeam",
} as const;
export const appValidator = v.union(
  v.literal(APP.OBS),
  v.literal(APP.EASYWORSHIP),
  v.literal(APP.PEWBEAM),
);
export type AppKey = Infer<typeof appValidator>;

// --- Live streaming platforms ----------------------------------------------

export const STREAM_PLATFORM = {
  YOUTUBE: "youtube",
  FACEBOOK: "facebook",
  TWITCH: "twitch",
  VIMEO: "vimeo",
  CUSTOM: "custom",
} as const;
export const streamPlatformValidator = v.union(
  v.literal(STREAM_PLATFORM.YOUTUBE),
  v.literal(STREAM_PLATFORM.FACEBOOK),
  v.literal(STREAM_PLATFORM.TWITCH),
  v.literal(STREAM_PLATFORM.VIMEO),
  v.literal(STREAM_PLATFORM.CUSTOM),
);
export type StreamPlatform = Infer<typeof streamPlatformValidator>;

// --- Church website --------------------------------------------------------

export const PROGRAM_CATEGORY = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  PROVINCIAL: "provincial",
} as const;
export const programCategoryValidator = v.union(
  v.literal(PROGRAM_CATEGORY.DAILY),
  v.literal(PROGRAM_CATEGORY.WEEKLY),
  v.literal(PROGRAM_CATEGORY.MONTHLY),
  v.literal(PROGRAM_CATEGORY.PROVINCIAL),
);
export type ProgramCategory = Infer<typeof programCategoryValidator>;

export const churchSocialValidator = v.object({
  platform: v.string(),
  url: v.string(),
});

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // Public programs shown on the site: daily, weekly, monthly, provincial.
    programs: defineTable({
      title: v.string(),
      description: v.string(),
      category: programCategoryValidator,
      day: v.string(),
      time: v.string(),
      venue: v.optional(v.string()),
      order: v.number(),
      isActive: v.boolean(),
    }).index("by_category", ["category"]),

    // Single church profile record powering the site (name, contact, socials…).
    churchInfo: defineTable({
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
      updatedAt: v.number(),
    }),

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // One subscription record per user (trial + provider billing).
    subscriptions: defineTable({
      userId: v.id("users"),
      plan: planValidator,
      status: subStatusValidator,
      provider: v.optional(billingProviderValidator),
      trialEndsAt: v.optional(v.number()),
      currentPeriodEnd: v.optional(v.number()),
      providerCustomerId: v.optional(v.string()),
      providerSubscriptionId: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_provider_customer", ["providerCustomerId"])
      .index("by_provider_subscription", ["providerSubscriptionId"]),

    // The shared content catalog: songs, scripture, backgrounds, templates.
    catalogItems: defineTable({
      userId: v.id("users"),
      type: itemTypeValidator,
      title: v.string(),
      body: v.optional(v.string()),
      reference: v.optional(v.string()), // scripture reference, e.g. "John 3:16"
      artist: v.optional(v.string()),
      tags: v.array(v.string()),
      coverUrl: v.optional(v.string()),
      coverStorageId: v.optional(v.id("_storage")),
      accent: v.optional(v.string()), // gradient key for generated cover art
      isPublic: v.boolean(),
      isApproved: v.boolean(),
      downloads: v.number(),
      likedBy: v.array(v.id("users")),
    })
      .index("by_user", ["userId"])
      .index("by_type", ["type"]),

    // Service orders / run-of-show.
    services: defineTable({
      userId: v.id("users"),
      title: v.string(),
      date: v.number(),
      status: serviceStatusValidator,
      items: v.array(
        v.object({
          label: v.string(),
          type: serviceItemTypeValidator,
          content: v.optional(v.string()),
          reference: v.optional(v.string()),
          catalogItemId: v.optional(v.id("catalogItems")),
        }),
      ),
      notes: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // Multi-platform live streaming destinations (RTMP server + stream key).
    streamTargets: defineTable({
      userId: v.id("users"),
      platform: streamPlatformValidator,
      label: v.string(),
      rtmpUrl: v.string(),
      streamKey: v.string(),
      enabled: v.boolean(),
    }).index("by_user", ["userId"]),

    // Saved connection settings for OBS / EasyWorship / Pewbeam.
    connections: defineTable({
      userId: v.id("users"),
      app: appValidator,
      host: v.string(),
      port: v.optional(v.number()),
      password: v.optional(v.string()),
      url: v.optional(v.string()),
      token: v.optional(v.string()),
      enabled: v.boolean(),
      lastConnectedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    // Deployment-wide service API keys (Gemini, Bible API, Stripe, Paystack,
    // Supabase client keys). Values are encrypted at rest — see apiKeys.ts.
    apiKeys: defineTable({
      key: v.string(),
      encryptedValue: v.string(),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    // Saved sermon transcripts with detected verses.
    transcripts: defineTable({
      userId: v.id("users"),
      title: v.string(),
      sourceText: v.string(),
      verses: v.array(
        v.object({
          reference: v.string(),
          text: v.string(),
        }),
      ),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
