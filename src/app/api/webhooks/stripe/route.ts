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

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
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
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
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
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    console.error("Missing userId or tier in session metadata");
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

  console.log(`Checkout completed for user ${userId}, tier: ${tier}`);
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata");
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

  console.log(
    `Subscription updated for user ${userId}: ${status}, tier: ${tier}`
  );
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata");
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

  console.log(`Subscription canceled for user ${userId}`);
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  console.log(
    `Payment succeeded for customer ${customerId}, subscription ${subscriptionId}`
  );

  // Optionally send email receipt or notification
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  console.log(
    `Payment failed for customer ${customerId}, subscription ${subscriptionId}`
  );

  // Optionally send email notification to update payment method
  // Set subscription status to past_due

  if (subscriptionId) {
    const subscription = invoice.subscription as string;
    // The subscription status will be updated automatically via subscription.updated event
  }
}
