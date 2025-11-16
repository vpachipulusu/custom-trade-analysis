import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getSnapshotsByLayoutId } from "@/lib/db/snapshots";

/**
 * GET /api/snapshots?layoutId=xxx
 * Get all snapshots for a specific layout
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get("layoutId");

    if (!layoutId) {
      return NextResponse.json(
        { error: "layoutId query parameter is required" },
        { status: 400 }
      );
    }

    // Get snapshots for the layout
    const snapshots = await getSnapshotsByLayoutId(layoutId);

    return NextResponse.json(snapshots, { status: 200 });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
