/**
 * Stripe Configuration
 * Handles Stripe initialization and subscription management
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
});

/**
 * Subscription tiers and their limits
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      layoutsPerMonth: 3,
      snapshotsPerMonth: 10,
      analysesPerMonth: 5,
    },
    features: [
      "3 layouts",
      "10 snapshots per month",
      "5 AI analyses per month",
      "Basic support",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    limits: {
      layoutsPerMonth: 50,
      snapshotsPerMonth: 200,
      analysesPerMonth: 100,
    },
    features: [
      "50 layouts",
      "200 snapshots per month",
      "100 AI analyses per month",
      "Priority support",
      "Advanced analytics",
      "Export to PDF",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
    limits: {
      layoutsPerMonth: -1, // Unlimited
      snapshotsPerMonth: -1,
      analysesPerMonth: -1,
    },
    features: [
      "Unlimited layouts",
      "Unlimited snapshots",
      "Unlimited AI analyses",
      "24/7 priority support",
      "Advanced analytics",
      "Export to PDF",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Get subscription limits for a tier
 */
export function getSubscriptionLimits(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier].limits;
}

/**
 * Check if usage is within limits
 */
export function isWithinLimit(usage: number, limit: number): boolean {
  // -1 means unlimited
  if (limit === -1) return true;
  return usage < limit;
}

/**
 * Get all subscription tiers for display
 */
export function getSubscriptionTiers() {
  return Object.entries(SUBSCRIPTION_TIERS).map(([key, value]) => ({
    id: key as SubscriptionTier,
    ...value,
  }));
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return session;
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription status from Stripe
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  return subscription;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
