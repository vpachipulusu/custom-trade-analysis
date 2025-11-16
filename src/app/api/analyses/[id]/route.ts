import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getAnalysisById } from "@/lib/db/analyses";
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

    return NextResponse.json(analysis);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
