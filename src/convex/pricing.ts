// Plan pricing + trial constants for Alpha Worship One.
// Stripe charges in USD; Paystack charges in Nigerian Naira (kobo).

export const PRO_PRICE_USD = 8.76;
export const PRO_PRICE_NGN = 13140; // ₦13,140 / month (~ $8.76 at ≈ ₦1,500/$)
export const PRO_PRICE_NGN_KOBO = PRO_PRICE_NGN * 100;
export const TRIAL_DAYS = 30;
export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
