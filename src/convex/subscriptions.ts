import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { MONTH_MS, TRIAL_DAYS } from "./pricing";
import {
  BILLING_PROVIDER,
  PLAN,
  SUB_STATUS,
  subStatusValidator,
} from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export const mySubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const now = Date.now();

    if (!sub) {
      return {
        plan: PLAN.FREE,
        status: SUB_STATUS.NONE,
        provider: undefined,
        access: "free" as const,
        trialActive: false,
        trialExpired: false,
        daysLeft: 0,
        currentPeriodEnd: undefined,
        trialEndsAt: undefined,
      };
    }

    let access: "free" | "pro" = "free";
    let trialActive = false;
    let trialExpired = false;

    if (sub.plan === PLAN.PRO && sub.status === SUB_STATUS.TRIALING) {
      if (sub.trialEndsAt && sub.trialEndsAt > now) {
        trialActive = true;
        access = "pro";
      } else {
        trialExpired = true;
      }
    } else if (
      sub.plan === PLAN.PRO &&
      (sub.status === SUB_STATUS.ACTIVE || sub.status === SUB_STATUS.PAST_DUE)
    ) {
      access = "pro";
    }

    const daysLeft = sub.trialEndsAt
      ? Math.max(0, Math.ceil((sub.trialEndsAt - now) / DAY_MS))
      : 0;

    return { ...sub, access, trialActive, trialExpired, daysLeft };
  },
});

/** Start the 30-day Pro trial. Called when a new account first enters the app. */
export const ensureTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const trialEndsAt = Date.now() + TRIAL_DAYS * DAY_MS;
    if (existing) {
      if (existing.plan === PLAN.FREE || existing.status === SUB_STATUS.NONE) {
        await ctx.db.patch(existing._id, {
          plan: PLAN.PRO,
          status: SUB_STATUS.TRIALING,
          trialEndsAt,
          provider: undefined,
          providerCustomerId: undefined,
          providerSubscriptionId: undefined,
        });
      }
      return existing._id;
    }
    return await ctx.db.insert("subscriptions", {
      userId: user._id,
      plan: PLAN.PRO,
      status: SUB_STATUS.TRIALING,
      trialEndsAt,
    });
  },
});

// --- Internal helpers used by webhooks / actions -----------------------------

export const getByUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .first();
  },
});

export const markPaystackPending = internalMutation({
  args: { userId: v.string(), reference: v.string() },
  handler: async (ctx, { userId, reference }) => {
    const uid = userId as Id<"users">;
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .first();
    const patch = {
      plan: PLAN.PRO,
      status: SUB_STATUS.PENDING,
      provider: BILLING_PROVIDER.PAYSTACK,
      providerSubscriptionId: reference,
      currentPeriodEnd: Date.now() + MONTH_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("subscriptions", { userId: uid, ...patch });
  },
});

export const activateFromStripe = internalMutation({
  args: {
    userId: v.optional(v.string()),
    customerId: v.string(),
    subscriptionId: v.optional(v.string()),
    status: subStatusValidator,
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_provider_customer", (q) =>
        q.eq("providerCustomerId", args.customerId),
      )
      .first();
    const patch = {
      plan: args.status === SUB_STATUS.CANCELED ? PLAN.FREE : PLAN.PRO,
      status: args.status,
      provider: BILLING_PROVIDER.STRIPE,
      providerCustomerId: args.customerId,
      providerSubscriptionId: args.subscriptionId,
      currentPeriodEnd: args.periodEnd
        ? args.periodEnd * 1000
        : existing?.currentPeriodEnd ?? Date.now() + MONTH_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    if (!args.userId) return null;
    return await ctx.db.insert("subscriptions", {
      userId: args.userId as Id<"users">,
      ...patch,
    });
  },
});

export const activateFromPaystack = internalMutation({
  args: {
    userId: v.optional(v.string()),
    reference: v.string(),
    status: v.optional(subStatusValidator),
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_provider_subscription", (q) =>
        q.eq("providerSubscriptionId", args.reference),
      )
      .first();
    const patch = {
      plan: PLAN.PRO,
      status: args.status ?? SUB_STATUS.ACTIVE,
      provider: BILLING_PROVIDER.PAYSTACK,
      providerSubscriptionId: args.reference,
      currentPeriodEnd: args.periodEnd
        ? args.periodEnd * 1000
        : Date.now() + MONTH_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    if (!args.userId) return null;
    return await ctx.db.insert("subscriptions", {
      userId: args.userId as Id<"users">,
      ...patch,
    });
  },
});

export const cancelLocal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .first();
    if (!sub) return null;
    await ctx.db.patch(sub._id, { status: SUB_STATUS.CANCELED });
    return sub._id;
  },
});
