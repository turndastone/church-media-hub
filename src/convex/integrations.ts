"use node";

import { action } from "./_generated/server";

/**
 * Reports which server-side integration keys are configured. Supabase uses
 * client keys (VITE_*), so it is detected separately on the frontend.
 */
export const status = action({
  args: {},
  handler: async () => ({
    stripe: Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID,
    ),
    paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    bibleApi: Boolean(process.env.BIBLE_API_KEY),
  }),
});
