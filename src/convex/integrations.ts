"use node";

import { action } from "./_generated/server";
import { resolveSecret } from "./apiKeys";

/**
 * Reports which server-side integration keys are configured — from the in-app
 * API Keys store first, then the platform Keys tab. Supabase uses client keys
 * (VITE_*), so it is detected separately on the frontend.
 */
export const status = action({
  args: {},
  handler: async (ctx) => ({
    stripe: Boolean(
      (await resolveSecret(ctx, "STRIPE_SECRET_KEY")) &&
        (await resolveSecret(ctx, "STRIPE_PRO_PRICE_ID")),
    ),
    paystack: Boolean(await resolveSecret(ctx, "PAYSTACK_SECRET_KEY")),
    gemini: Boolean(
      (await resolveSecret(ctx, "GEMINI_API_KEY")) ||
        process.env.GOOGLE_API_KEY,
    ),
    bibleApi: Boolean(await resolveSecret(ctx, "BIBLE_API_KEY")),
    /** Whether stored secrets are encrypted at rest. */
    cryptKeySet: Boolean(process.env.INTEGRATION_CRYPT_KEY),
  }),
});
