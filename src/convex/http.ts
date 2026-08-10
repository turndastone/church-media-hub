import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(data: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha512Hex(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyHmac(secret: string, body: string, signature: string) {
  const hash = await hmacSha512Hex(secret, body);
  return safeEqual(hash, signature.toLowerCase());
}

async function verifyStripeSignature(
  secret: string,
  body: string,
  header: string,
) {
  const parts = new Map(
    header.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx), p.slice(idx + 1)];
    }),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1) return false;
  const expected = await sha256Hex(`${t}.${body}`);
  return safeEqual(expected, v1);
}

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret =
      process.env.STRIPE_WEBHOOK_SECRET ||
      (await ctx.runAction(internal.apiKeys.getSecret, {
        key: "STRIPE_WEBHOOK_SECRET",
      }));
    const signature = request.headers.get("stripe-signature");
    if (!secret || !signature) {
      return new Response("Missing webhook configuration", { status: 400 });
    }
    const body = await request.text();
    if (!(await verifyStripeSignature(secret, body, signature))) {
      return new Response("Invalid signature", { status: 400 });
    }
    const event = JSON.parse(body) as {
      type: string;
      data?: { object?: Record<string, unknown> };
    };
    const obj = event.data?.object ?? {};

    if (event.type === "checkout.session.completed") {
      await ctx.runMutation(internal.subscriptions.activateFromStripe, {
        userId: (obj.metadata as { userId?: string } | undefined)?.userId,
        customerId: String(obj.customer ?? ""),
        subscriptionId: obj.subscription ? String(obj.subscription) : undefined,
        status: "active",
      });
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const rawStatus = String(obj.status ?? "");
      const status =
        rawStatus === "canceled" || rawStatus === "unpaid"
          ? "canceled"
          : rawStatus === "past_due"
            ? "past_due"
            : rawStatus === "trialing"
              ? "trialing"
              : "active";
      await ctx.runMutation(internal.subscriptions.activateFromStripe, {
        customerId: String(obj.customer ?? ""),
        subscriptionId: String(obj.id ?? ""),
        status,
        periodEnd:
          typeof obj.current_period_end === "number"
            ? obj.current_period_end
            : undefined,
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

http.route({
  path: "/paystack-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret =
      process.env.PAYSTACK_SECRET_KEY ||
      (await ctx.runAction(internal.apiKeys.getSecret, {
        key: "PAYSTACK_SECRET_KEY",
      }));
    const signature = request.headers.get("x-paystack-signature");
    if (!secret || !signature) {
      return new Response("Missing webhook configuration", { status: 400 });
    }
    const body = await request.text();
    if (!(await verifyHmac(secret, body, signature))) {
      return new Response("Invalid signature", { status: 400 });
    }
    const event = JSON.parse(body) as {
      event: string;
      data?: {
        reference?: string;
        metadata?: { userId?: string; reference?: string };
      };
    };

    if (event.event === "charge.success") {
      const data = event.data ?? {};
      await ctx.runMutation(internal.subscriptions.activateFromPaystack, {
        userId: data.metadata?.userId,
        reference: data.reference ?? data.metadata?.reference ?? "",
        status: "active",
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
