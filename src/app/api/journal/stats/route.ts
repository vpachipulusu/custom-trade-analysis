import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getMonthlyStats, getAllTimeStats } from "@/lib/db/journal";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * GET /api/journal/stats
 * Get trading statistics
 * Query params:
 *  - type: "monthly" | "alltime" (default: "alltime")
 *  - year: number (required if type=monthly)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "alltime";
    const year = searchParams.get("year");

    if (type === "monthly") {
      if (!year) {
        return NextResponse.json(
          { error: "Year is required for monthly stats" },
          { status: 400 }
        );
      }

      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }

      const stats = await getMonthlyStats(authResult.user.userId, yearNum);
      return NextResponse.json({ stats, type: "monthly", year: yearNum });
    } else {
      const stats = await getAllTimeStats(authResult.user.userId);
      return NextResponse.json({ stats, type: "alltime" });
    }
  } catch (error) {
    const logger = getLogger();
    logger.error("Get stats error", {
      error: error instanceof Error ? error.message : String(error)
    });
    return createErrorResponse(error, "Failed to get statistics");
  }
}
