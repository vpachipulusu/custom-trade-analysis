import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getLayoutById } from "@/lib/db/layouts";
import { createSnapshot } from "@/lib/db/snapshots";
import { generateSnapshot } from "@/lib/services/chartimg";
import { captureWithPlaywright } from "@/lib/services/playwright-screenshot";
import { captureWithPuppeteer } from "@/lib/services/puppeteer-screenshot";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { decrypt } from "@/lib/utils/encryption";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * POST /api/snapshot
 * Generate a new snapshot for a layout
 */
export async function POST(request: NextRequest) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for logging
    LogContext.set({ userId: authResult.user.userId });

    const body = await request.json();
    const { layoutId } = body;

    if (!layoutId) {
      return NextResponse.json(
        { error: "layoutId is required" },
        { status: 400 }
      );
    }

    // Get layout and verify ownership
    const layout = await getLayoutById(layoutId);
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    if (!verifyOwnership(authResult.user.userId, layout.userId)) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to generate snapshots for this layout",
        },
        { status: 403 }
      );
    }

    // Get user's TradingView session credentials
    const { getUserById } = await import("@/lib/db/users");
    const user = await getUserById(authResult.user.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Decrypt sessionid (it's encrypted in the database)
    let decryptedSessionId = user.tvSessionId;
    try {
      if (user.tvSessionId && user.tvSessionId.includes(":")) {
        // Check if it's encrypted (format: iv:encryptedData)
        decryptedSessionId = decrypt(user.tvSessionId);
        logger.debug("Decrypted sessionid", {
          sessionIdLength: decryptedSessionId.length,
          layoutId
        });
      } else {
        logger.debug("Using plain sessionid (not encrypted)", { layoutId });
      }
    } catch (error) {
      logger.error("Failed to decrypt sessionid", {
        error: error instanceof Error ? error.message : String(error),
        layoutId
      });
      // If decryption fails, use as-is (might be plain text)
    }

    let snapshotResult: { url: string; expiresAt: Date };

    // Debug: Log what we have
    logger.debug("Layout and user data for snapshot", {
      hasLayoutId: !!layout.layoutId,
      hasTvSessionId: !!user.tvSessionId,
      hasTvSessionIdSign: !!user.tvSessionIdSign,
      layoutId: layout.layoutId,
    });

    // Use Puppeteer ONLY - CHART-IMG is disabled
    if (!layout.layoutId || !decryptedSessionId || !user.tvSessionIdSign) {
      logger.warn("Missing required credentials for Puppeteer screenshot", {
        hasLayoutId: !!layout.layoutId,
        hasSessionid: !!decryptedSessionId,
        hasSessionidSign: !!user.tvSessionIdSign,
        layoutId
      });
      return NextResponse.json(
        {
          error:
            "Missing TradingView session credentials. Please update your session credentials in Profile > TradingView Session.",
        },
        { status: 400 }
      );
    }

    logger.info("Using Puppeteer to capture chart", {
      layoutId: layout.layoutId
    });

    const screenshotDataUrl = await captureWithPuppeteer({
      layoutId: layout.layoutId,
      sessionid: decryptedSessionId,
      sessionidSign: user.tvSessionIdSign,
      width: 1920,
      height: 1080,
    });

    // For Puppeteer screenshots, we store the base64 data URL directly
    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    snapshotResult = {
      url: screenshotDataUrl,
      expiresAt,
    };

    // Save snapshot to database
    const snapshot = await createSnapshot(
      layoutId,
      snapshotResult.url,
      snapshotResult.expiresAt
    );

    logger.info("Snapshot created successfully", {
      snapshotId: snapshot.id,
      layoutId
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    logger.error("Snapshot generation error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle specific CHART-IMG errors
    if (error instanceof Error && error.message.includes("CHART-IMG")) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 } // Bad Gateway
      );
    }

    return createErrorResponse(error, 500);
  }
}
