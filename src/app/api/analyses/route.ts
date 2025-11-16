import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getAnalysesByUserId } from "@/lib/db/analyses";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * GET /api/analyses
 * Get paginated analyses for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Get analyses
    const { analyses, total } = await getAnalysesByUserId(
      authResult.user.userId,
      page,
      limit
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
