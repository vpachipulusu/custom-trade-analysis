import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getSnapshotsByLayoutId } from "@/lib/db/snapshots";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * GET /api/snapshots?layoutId=xxx
 * Get all snapshots for a specific layout
 */
export async function GET(request: NextRequest) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for logging
    LogContext.set({ userId: authResult.user.userId });

    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get("layoutId");

    if (!layoutId) {
      logger.warn("Missing layoutId query parameter");
      return NextResponse.json(
        { error: "layoutId query parameter is required" },
        { status: 400 }
      );
    }

    // Get snapshots for the layout
    const snapshots = await getSnapshotsByLayoutId(layoutId);

    logger.info("Snapshots fetched successfully", {
      layoutId,
      count: snapshots.length
    });

    return NextResponse.json(snapshots, { status: 200 });
  } catch (error) {
    logger.error("Error fetching snapshots", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
