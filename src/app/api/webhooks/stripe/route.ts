/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for subscription management
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { updateUser, getUserById } from "@/lib/db/users";
import Stripe from "stripe";
import { getLogger } from "@/lib/logging";

export async function POST(request: NextRequest) {
  const logger = getLogger();

  try {
    // Get raw body
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      logger.warn("Stripe webhook missing signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      logger.error("Webhook signature verification failed", {
        error: err instanceof Error ? err.message : String(err)
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    logger.info("Stripe webhook received", { eventType: event.type });

    // Handle event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        logger.debug("Unhandled Stripe event type", { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const logger = getLogger();
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    logger.error("Missing userId or tier in session metadata", {
      sessionId: session.id
    });
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Update user with subscription info
  await updateUser(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscriptionTier: tier,
    subscriptionStatus: "active",
  });

  logger.info("Checkout completed", {
    userId,
    tier,
    subscriptionId,
    customerId
  });
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const logger = getLogger();
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    logger.error("Missing userId in subscription metadata", {
      subscriptionId: subscription.id
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  // Determine tier from price ID
  let tier = "free";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = "pro";
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    tier = "enterprise";
  }

  // Update user
  await updateUser(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: currentPeriodEnd,
    subscriptionTier: tier,
    subscriptionStatus: status,
  });

  logger.info("Subscription updated", {
    userId,
    status,
    tier,
    subscriptionId: subscription.id
  });
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const logger = getLogger();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    logger.error("Missing userId in subscription metadata", {
      subscriptionId: subscription.id
    });
    return;
  }

  // Downgrade to free tier
  await updateUser(userId, {
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
    subscriptionTier: "free",
    subscriptionStatus: "canceled",
  });

  logger.info("Subscription canceled", { userId, subscriptionId: subscription.id });
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const logger = getLogger();
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  logger.info("Payment succeeded", {
    customerId,
    subscriptionId,
    amount: invoice.amount_paid,
    invoiceId: invoice.id
  });

  // Optionally send email receipt or notification
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const logger = getLogger();
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  logger.warn("Payment failed", {
    customerId,
    subscriptionId,
    amount: invoice.amount_due,
    invoiceId: invoice.id
  });

  // Optionally send email notification to update payment method
  // Set subscription status to past_due

  if (subscriptionId) {
    const subscription = invoice.subscription as string;
    // The subscription status will be updated automatically via subscription.updated event
  }
}
