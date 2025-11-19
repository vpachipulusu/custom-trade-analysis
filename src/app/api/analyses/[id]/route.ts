import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getAnalysisById } from "@/lib/db/analyses";
import { getLayoutsBySymbol } from "@/lib/db/layouts";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * GET /api/analyses/[id]
 * Get a specific analysis by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;

    // Get analysis
    const analysis = await getAnalysisById(id);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (!verifyOwnership(authResult.user.userId, analysis.userId)) {
      return NextResponse.json(
        { error: "You do not have permission to view this analysis" },
        { status: 403 }
      );
    }

    // Cast to any for type compatibility
    const analysisWithLayout = analysis as any;
    const symbol = analysisWithLayout.snapshot?.layout?.symbol;

    // If this analysis has a symbol, check if there are multiple layouts for the same symbol
    let multiLayoutData = {};
    if (symbol) {
      const layouts = await getLayoutsBySymbol(authResult.user.userId, symbol);

      if (layouts && layouts.length > 1) {
        // Cast to any to access snapshots
        const layoutsWithSnapshots = (layouts as any[])
          .filter((layout) => layout.snapshots && layout.snapshots.length > 0)
          .map((layout) => ({
            interval: layout.interval || "Unknown",
            layoutId: layout.id,
            snapshotId: layout.snapshots[0].id,
            imageUrl: layout.snapshots[0].url,
          }));

        if (layoutsWithSnapshots.length > 1) {
          multiLayoutData = {
            layoutsAnalyzed: layoutsWithSnapshots.length,
            intervals: layoutsWithSnapshots.map((l) => l.interval),
            multiLayoutSnapshots: layoutsWithSnapshots,
          };
        }
      }
    }

    return NextResponse.json({
      ...analysis,
      ...multiLayoutData,
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
