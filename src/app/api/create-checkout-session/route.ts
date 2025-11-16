/**
 * Create Stripe Checkout Session
 * POST /api/create-checkout-session
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { handleApiError } from "@/lib/utils/errorHandler";
import { createCheckoutSession, SUBSCRIPTION_TIERS } from "@/lib/stripe";
import { getUserByFirebaseUid, updateUser } from "@/lib/db/users";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const firebaseUid = await authenticateRequest(request);

    // Get request body
    const body = await request.json();
    const { tier } = body;

    // Validate tier
    if (!tier || !["pro", "enterprise"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await getUserByFirebaseUid(firebaseUid);

    // Get price ID for tier
    const priceId =
      SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS].priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID not configured for this tier" },
        { status: 500 }
      );
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          firebaseUid: user.firebaseUid,
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      await updateUser(user.id, {
        stripeCustomerId: customerId,
      });
    }

    // Get base URL
    const baseUrl = request.headers.get("origin") || "http://localhost:3000";

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        tier,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
