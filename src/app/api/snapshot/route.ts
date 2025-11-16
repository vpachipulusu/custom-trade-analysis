import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getLayoutById } from "@/lib/db/layouts";
import { createSnapshot } from "@/lib/db/snapshots";
import { generateSnapshot } from "@/lib/services/chartimg";
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

    // Generate snapshot using CHART-IMG API
    const snapshotResult = await generateSnapshot({
      layoutId: layout.layoutId || undefined,
      symbol: layout.symbol || undefined,
      interval: layout.interval || undefined,
      sessionid: decryptedSessionId,
      sessionidSign: layout.sessionidSign || undefined,
    });

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
