import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getLayoutById } from "@/lib/db/layouts";
import { createSnapshot } from "@/lib/db/snapshots";
import { generateSnapshot } from "@/lib/services/chartimg";
import { captureWithPlaywright } from "@/lib/services/playwright-screenshot";
import { decrypt } from "@/lib/utils/encryption";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * POST /api/snapshot
 * Generate a new snapshot for a layout
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

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

    // Decrypt sessionid if exists
    let decryptedSessionId: string | undefined;
    if (layout.sessionid) {
      try {
        decryptedSessionId = decrypt(layout.sessionid);
      } catch (error) {
        console.error("Failed to decrypt sessionid:", error);
        // Continue without sessionid if decryption fails
      }
    }

    let snapshotResult: { url: string; expiresAt: Date };

    // Debug: Log what we have
    console.log("Layout data:", {
      hasLayoutId: !!layout.layoutId,
      hasSessionid: !!layout.sessionid,
      hasSessionidSign: !!layout.sessionidSign,
      layoutId: layout.layoutId,
    });

    // Use Playwright ONLY - CHART-IMG is disabled
    if (!layout.layoutId || !layout.sessionid || !layout.sessionidSign) {
      return NextResponse.json(
        {
          error:
            "Missing required credentials (layoutId, sessionid, or sessionidSign) for Playwright screenshot",
        },
        { status: 400 }
      );
    }

    console.log(
      "Using Playwright to capture chart with layoutId:",
      layout.layoutId
    );

    const screenshotDataUrl = await captureWithPlaywright({
      layoutId: layout.layoutId,
      sessionid: layout.sessionid,
      sessionidSign: layout.sessionidSign,
      width: 1920,
      height: 1080,
    });

    // For Playwright screenshots, we store the base64 data URL directly
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

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Snapshot generation error:", error);

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
