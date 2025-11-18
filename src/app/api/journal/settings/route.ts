import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import {
  getOrCreateJournalSettings,
  updateJournalSettings,
} from "@/lib/db/journal";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * GET /api/journal/settings
 * Get journal settings for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const settings = await getOrCreateJournalSettings(authResult.user.userId);

    return NextResponse.json({ settings });
  } catch (error) {
    const logger = getLogger();
    logger.error("Get journal settings error", {
      error: error instanceof Error ? error.message : String(error)
    });
    return createErrorResponse(error, "Failed to get journal settings");
  }
}

/**
 * PATCH /api/journal/settings
 * Update journal settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const {
      startingBalance,
      currentBalance,
      currency,
      timezone,
      defaultPositionSize,
      defaultRiskPercent,
    } = body;

    // Validate data types if provided
    if (
      startingBalance !== undefined &&
      (typeof startingBalance !== "number" || startingBalance < 0)
    ) {
      return NextResponse.json(
        { error: "Invalid starting balance" },
        { status: 400 }
      );
    }

    if (currentBalance !== undefined && typeof currentBalance !== "number") {
      return NextResponse.json(
        { error: "Invalid current balance" },
        { status: 400 }
      );
    }

    const settings = await updateJournalSettings(authResult.user.userId, {
      startingBalance,
      currentBalance,
      currency,
      timezone,
      defaultPositionSize,
      defaultRiskPercent,
    });

    const logger = getLogger();
    logger.info("Journal settings updated successfully");
    return NextResponse.json({ settings });
  } catch (error) {
    const logger = getLogger();
    logger.error("Update journal settings error", {
      error: error instanceof Error ? error.message : String(error)
    });
    return createErrorResponse(error, "Failed to update journal settings");
  }
}
