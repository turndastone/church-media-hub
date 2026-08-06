"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PRO_PRICE_NGN_KOBO } from "./pricing";
import { billingProviderValidator } from "./schema";

/**
 * Creates a checkout session with Stripe (USD) or Paystack (NGN).
 * Pass trialDays > 0 to start a fresh 30-day trial alongside the upgrade.
 */
export const createCheckoutSession = action({
  args: {
    provider: billingProviderValidator,
    trialDays: v.optional(v.number()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    if (args.provider === "stripe") {
      const key = process.env.STRIPE_SECRET_KEY;
      const priceId = process.env.STRIPE_PRO_PRICE_ID;
      if (!key || !priceId) {
        throw new Error(
          "Stripe isn't configured yet — add STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID in the project keys.",
        );
      }
      const params = new URLSearchParams();
      params.set("mode", "subscription");
      params.set("line_items[0][price]", priceId);
      params.set("line_items[0][quantity]", "1");
      params.set("client_reference_id", userId);
      params.set("success_url", args.successUrl);
      params.set("cancel_url", args.cancelUrl);
      params.set("metadata[userId]", userId);
      if (args.trialDays && args.trialDays > 0) {
        params.set("subscription_data[trial_period_days]", String(args.trialDays));
      }
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = (await res.json()) as { url?: string; error?: { message?: string } };
      if (!res.ok || !data.url) {
        throw new Error(data?.error?.message ?? "Stripe checkout failed.");
      }
      return { url: data.url };
    }

    // Paystack (Nigerian Naira)
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      throw new Error(
        "Paystack isn't configured yet — add PAYSTACK_SECRET_KEY in the project keys.",
      );
    }
    const planCode = process.env.PAYSTACK_PLAN_CODE;
    const user = await ctx.runQuery(api.users.currentUser);
    const email = user?.email ?? `${userId}@alpha-worship.local`;
    const reference = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: PRO_PRICE_NGN_KOBO,
        currency: "NGN",
        reference,
        metadata: { userId, provider: "paystack", plan: "pro", reference },
        ...(planCode ? { plan: planCode } : {}),
        callback_url: args.successUrl,
      }),
    });
    const data = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!res.ok || !data.status || !data.data?.authorization_url) {
      throw new Error(data?.message ?? "Paystack checkout failed.");
    }

    await ctx.runMutation(internal.subscriptions.markPaystackPending, {
      userId,
      reference,
    });
    return { url: data.data.authorization_url };
  },
});

/** Cancel the current subscription (Stripe: end at period; Paystack: local cancel). */
export const cancelSubscription = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const sub = await ctx.runQuery(internal.subscriptions.getByUser, { userId });
    if (!sub) throw new Error("No active subscription found.");

    if (sub.provider === "stripe" && sub.providerSubscriptionId) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("Stripe isn't configured — cannot reach the billing provider.");
      }
      const res = await fetch(
        `https://api.stripe.com/v1/subscriptions/${sub.providerSubscriptionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
        },
      );
      if (!res.ok) throw new Error("Stripe rejected the cancellation request.");
    }

    await ctx.runMutation(internal.subscriptions.cancelLocal, { userId });
    return { ok: true };
  },
});
