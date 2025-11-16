# Stripe Integration Guide

Complete guide for setting up and testing Stripe subscriptions in the TradingView AI Evaluator.

## Overview

The application includes three subscription tiers:

- **Free**: Limited features (3 layouts, 10 snapshots, 5 analyses per month)
- **Pro**: Enhanced limits ($29/month)
- **Enterprise**: Unlimited usage ($99/month)

## Table of Contents

1. [Stripe Account Setup](#stripe-account-setup)
2. [Environment Variables](#environment-variables)
3. [Database Migration](#database-migration)
4. [Testing with Stripe CLI](#testing-with-stripe-cli)
5. [Production Deployment](#production-deployment)
6. [Usage in Code](#usage-in-code)
7. [Troubleshooting](#troubleshooting)

---

## 1. Stripe Account Setup

### Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification (for live mode)
3. Switch to **Test Mode** (toggle in top-right)

### Create Products and Prices

1. Go to **Products** → **Add product**

**Pro Plan:**

- Name: `TradingView AI Pro`
- Description: `50 layouts, 200 snapshots, 100 analyses per month`
- Pricing: Recurring, Monthly, $29
- Copy the **Price ID** (starts with `price_`)

**Enterprise Plan:**

- Name: `TradingView AI Enterprise`
- Description: `Unlimited layouts, snapshots, and analyses`
- Pricing: Recurring, Monthly, $99
- Copy the **Price ID** (starts with `price_`)

### Get API Keys

1. Go to **Developers** → **API keys**
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)

### Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

---

## 2. Environment Variables

Add to your `.env.local`:

```bash
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY="sk_test_YOUR_TEST_SECRET_KEY_HERE"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE"

# Stripe Price IDs
STRIPE_PRO_PRICE_ID="price_YOUR_PRO_PRICE_ID_HERE"
STRIPE_ENTERPRISE_PRICE_ID="price_YOUR_ENTERPRISE_PRICE_ID_HERE"

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
```

For production, use live mode keys (replace `_test_` with live keys).

---

## 3. Database Migration

Update your Prisma schema with subscription fields (already done):

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_subscription_fields

# Apply to production
npx prisma migrate deploy
```

---

## 4. Testing with Stripe CLI

### Install Stripe CLI

**macOS (Homebrew):**

```bash
brew install stripe/stripe-cli/stripe
```

**Windows (Scoop):**

```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Or download from:** [github.com/stripe/stripe-cli/releases](https://github.com/stripe/stripe-cli/releases)

### Login to Stripe

```bash
stripe login
```

This will open your browser to authenticate.

### Forward Webhooks to Local Server

```bash
# Start your Next.js dev server
npm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret that appears (starts with `whsec_`) and add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### Test Checkout Flow

1. Start your app: `npm run dev`
2. Start webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Log in to your app
4. Try to exceed free tier limits (create 4+ layouts)
5. Click "Upgrade Plan" when limit prompt appears
6. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
7. Complete checkout
8. Verify in Stripe dashboard: **Payments** → **Subscriptions**

### Test Webhook Events

Trigger test events manually:

```bash
# Test successful checkout
stripe trigger checkout.session.completed

# Test subscription created
stripe trigger customer.subscription.created

# Test successful payment
stripe trigger invoice.payment_succeeded

# Test failed payment
stripe trigger invoice.payment_failed

# Test subscription canceled
stripe trigger customer.subscription.deleted
```

Monitor webhook logs:

```bash
stripe logs tail
```

---

## 5. Production Deployment

### Update Environment Variables

In Vercel (or your hosting platform):

1. Go to **Project Settings** → **Environment Variables**
2. Replace test keys with **live mode** keys:
   ```bash
   STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_SECRET_KEY_HERE"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE"
   STRIPE_PRO_PRICE_ID="price_YOUR_LIVE_PRO_PRICE_ID"  # Live price ID
   STRIPE_ENTERPRISE_PRICE_ID="price_YOUR_LIVE_ENTERPRISE_PRICE_ID"  # Live price ID
   STRIPE_WEBHOOK_SECRET="whsec_YOUR_LIVE_WEBHOOK_SECRET"  # Production webhook secret
   ```

### Update Webhook Endpoint

1. In Stripe Dashboard (live mode):
2. Go to **Developers** → **Webhooks**
3. Add endpoint: `https://your-production-domain.com/api/webhooks/stripe`
4. Select same events as test mode
5. Copy new webhook secret and update `STRIPE_WEBHOOK_SECRET`

### Redeploy Application

```bash
git push origin main  # Auto-deploy on Vercel
```

---

## 6. Usage in Code

### Enforce Subscription Limits

Update your API routes to check limits:

```typescript
// Example: POST /api/layouts
import { canCreateLayout } from "@/lib/middleware/subscription";
import { getUserByFirebaseUid } from "@/lib/db/users";

export async function POST(request: Request) {
  const firebaseUid = await authenticateRequest(request);
  const user = await getUserByFirebaseUid(firebaseUid);

  // Check if user can create layout
  const { allowed, reason, limit, current } = await canCreateLayout(user);

  if (!allowed) {
    return NextResponse.json(
      {
        error: reason,
        limit,
        current,
        upgrade: true, // Frontend should show upgrade prompt
      },
      { status: 403 }
    );
  }

  // Create layout...
}
```

### Display Subscription Status

Add to dashboard:

```typescript
// app/dashboard/page.tsx
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { getUserUsageAndLimits } from "@/lib/middleware/subscription";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const usageData = await getUserUsageAndLimits(user);

  return (
    <div>
      <SubscriptionStatus
        tier={usageData.tier}
        usage={usageData.usage}
        limits={usageData.limits}
      />
      {/* Other dashboard components */}
    </div>
  );
}
```

### Show Upgrade Prompt

```typescript
// When API returns 403 with upgrade flag
if (error.response?.data?.upgrade) {
  setUpgradePromptOpen(true);
  setLimitType("layout"); // or 'snapshot', 'analysis'
}
```

---

## 7. Troubleshooting

### Webhooks Not Received

**Issue**: Subscription not updating in database

**Solutions**:

1. Check webhook endpoint is correct in Stripe dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` matches webhook endpoint
3. Check server logs for webhook errors
4. Test locally with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Checkout Session Fails

**Issue**: Cannot create checkout session

**Solutions**:

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check price IDs match your Stripe products
3. Ensure Stripe customer is created successfully
4. Check console logs for Stripe errors

### Subscription Status Not Updating

**Issue**: User tier not updating after payment

**Solutions**:

1. Check webhook is receiving events (Stripe Dashboard → Developers → Webhooks → Logs)
2. Verify `metadata.userId` is included in checkout session
3. Check database user record has correct `stripeCustomerId`
4. Manually trigger webhook event to test: `stripe trigger checkout.session.completed`

### Testing Subscription Cancellation

**Issue**: Need to test downgrade to free tier

**Solutions**:

```bash
# Cancel subscription via Stripe CLI
stripe subscriptions cancel sub_XXXXXXXXXXXXXXXX

# Or in Stripe Dashboard:
# Payments → Subscriptions → [Select subscription] → Cancel subscription
```

### Limits Not Enforcing

**Issue**: Users can exceed limits

**Solutions**:

1. Verify subscription middleware is called in API routes
2. Check user's `subscriptionTier` field in database
3. Ensure usage count queries are correct (start of month)
4. Test with `console.log` in `canCreateLayout/Snapshot/Analysis` functions

---

## Test Cards

Stripe provides test cards for different scenarios:

| Card Number           | Scenario                            |
| --------------------- | ----------------------------------- |
| `4242 4242 4242 4242` | Successful payment                  |
| `4000 0000 0000 0002` | Card declined                       |
| `4000 0000 0000 9995` | Insufficient funds                  |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0000 0000 0341` | Attaches and charges successfully   |

All test cards use:

- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

## Customer Portal

Allow users to manage subscriptions:

### Enable Customer Portal

1. Go to Stripe Dashboard → **Settings** → **Billing** → **Customer portal**
2. Enable portal and configure settings
3. Set portal redirect URL: `https://your-domain.com/dashboard`

### Add Portal Link

```typescript
// Create portal session endpoint
// POST /api/create-portal-session

import { createPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  const session = await createPortalSession({
    customerId: user.stripeCustomerId!,
    returnUrl: `${baseUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}

// In your component
const handleManageSubscription = async () => {
  const response = await axios.post("/api/create-portal-session");
  window.location.href = response.data.url;
};
```

---

## Monitoring

### Stripe Dashboard

Monitor in real-time:

- **Payments**: All transactions
- **Subscriptions**: Active subscriptions
- **Customers**: Customer database
- **Developers → Webhooks**: Webhook delivery logs
- **Developers → Logs**: API request logs

### Application Logs

Log important events:

```typescript
console.log(`Subscription created: User ${userId}, Tier: ${tier}`);
console.log(`Payment succeeded: Customer ${customerId}`);
console.log(`Subscription canceled: User ${userId}`);
```

---

## Security Checklist

- [ ] Webhook signature verification enabled
- [ ] API keys stored in environment variables (never in code)
- [ ] Live mode keys only in production environment
- [ ] Test mode active during development
- [ ] Webhook endpoint uses HTTPS (production)
- [ ] Customer portal configured with correct redirect URL
- [ ] Subscription limits enforced on backend (not just frontend)

---

## Resources

- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Testing**: [stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Stripe CLI**: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
- **Webhooks Guide**: [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
- **Subscription Billing**: [stripe.com/docs/billing/subscriptions/overview](https://stripe.com/docs/billing/subscriptions/overview)

---

**Stripe integration complete!** 🎉 Users can now subscribe to Pro or Enterprise plans with full billing management.
