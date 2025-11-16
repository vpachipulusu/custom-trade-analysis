/**
 * Subscription Middleware
 * Enforces subscription limits on API operations
 */

import { User } from "@prisma/client";
import { getSubscriptionLimits, isWithinLimit } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export interface UsageCounts {
  layouts: number;
  snapshots: number;
  analyses: number;
}

/**
 * Get current usage counts for a user this month
 */
export async function getUserUsageThisMonth(
  userId: string
): Promise<UsageCounts> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [layouts, snapshots, analyses] = await Promise.all([
    // Count layouts created this month
    prisma.layout.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),

    // Count snapshots created this month
    prisma.snapshot.count({
      where: {
        layout: {
          userId,
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),

    // Count analyses created this month
    prisma.analysis.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),
  ]);

  return { layouts, snapshots, analyses };
}

/**
 * Check if user can create a layout
 */
export async function canCreateLayout(user: User): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}> {
  const tier = user.subscriptionTier as "free" | "pro" | "enterprise";
  const limits = getSubscriptionLimits(tier);
  const usage = await getUserUsageThisMonth(user.id);

  const allowed = isWithinLimit(usage.layouts, limits.layoutsPerMonth);

  return {
    allowed,
    reason: allowed ? undefined : "Monthly layout limit reached",
    limit: limits.layoutsPerMonth,
    current: usage.layouts,
  };
}

/**
 * Check if user can create a snapshot
 */
export async function canCreateSnapshot(user: User): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}> {
  const tier = user.subscriptionTier as "free" | "pro" | "enterprise";
  const limits = getSubscriptionLimits(tier);
  const usage = await getUserUsageThisMonth(user.id);

  const allowed = isWithinLimit(usage.snapshots, limits.snapshotsPerMonth);

  return {
    allowed,
    reason: allowed ? undefined : "Monthly snapshot limit reached",
    limit: limits.snapshotsPerMonth,
    current: usage.snapshots,
  };
}

/**
 * Check if user can create an analysis
 */
export async function canCreateAnalysis(user: User): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}> {
  const tier = user.subscriptionTier as "free" | "pro" | "enterprise";
  const limits = getSubscriptionLimits(tier);
  const usage = await getUserUsageThisMonth(user.id);

  const allowed = isWithinLimit(usage.analyses, limits.analysesPerMonth);

  return {
    allowed,
    reason: allowed ? undefined : "Monthly analysis limit reached",
    limit: limits.analysesPerMonth,
    current: usage.analyses,
  };
}

/**
 * Get all usage and limits for a user
 */
export async function getUserUsageAndLimits(user: User): Promise<{
  tier: string;
  usage: UsageCounts;
  limits: {
    layoutsPerMonth: number;
    snapshotsPerMonth: number;
    analysesPerMonth: number;
  };
  canCreate: {
    layout: boolean;
    snapshot: boolean;
    analysis: boolean;
  };
}> {
  const tier = user.subscriptionTier as "free" | "pro" | "enterprise";
  const limits = getSubscriptionLimits(tier);
  const usage = await getUserUsageThisMonth(user.id);

  return {
    tier,
    usage,
    limits,
    canCreate: {
      layout: isWithinLimit(usage.layouts, limits.layoutsPerMonth),
      snapshot: isWithinLimit(usage.snapshots, limits.snapshotsPerMonth),
      analysis: isWithinLimit(usage.analyses, limits.analysesPerMonth),
    },
  };
}

/**
 * Format limit message for UI
 */
export function formatLimitMessage(
  type: "layout" | "snapshot" | "analysis",
  current: number,
  limit: number
): string {
  if (limit === -1) {
    return `Unlimited ${type}s`;
  }

  const remaining = Math.max(0, limit - current);
  return `${remaining} of ${limit} ${type}s remaining this month`;
}
