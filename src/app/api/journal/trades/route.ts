import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getUserTrades, createTrade } from "@/lib/db/journal";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * GET /api/journal/trades
 * Get trades with filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const market = searchParams.get("market") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const trades = await getUserTrades(authResult.user.userId, {
      status,
      market,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json({ trades });
  } catch (error) {
    const logger = getLogger();
    logger.error("Get trades error", {
      error: error instanceof Error ? error.message : String(error)
    });
    return createErrorResponse(error, "Failed to get trades");
  }
}

/**
 * POST /api/journal/trades
 * Create new trade
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
    const {
      date,
      time,
      direction,
      market,
      entryPrice,
      accountBalance,
      positionSize,
      stopLossPrice,
      takeProfitPrice,
      tradeCosts,
      riskRewardRatio,
      tradeNotes,
      disciplineRating,
      emotionalState,
      strategy,
      setup,
      analysisId,
      tradeScreenshot,
      tags,
    } = body;

    // Validation
    if (
      !date ||
      !time ||
      !direction ||
      !market ||
      !entryPrice ||
      !accountBalance ||
      !positionSize
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: date, time, direction, market, entryPrice, accountBalance, positionSize",
        },
        { status: 400 }
      );
    }

    if (!["Long", "Short"].includes(direction)) {
      return NextResponse.json(
        { error: "Direction must be Long or Short" },
        { status: 400 }
      );
    }

    if (
      disciplineRating !== undefined &&
      (disciplineRating < 1 || disciplineRating > 10)
    ) {
      return NextResponse.json(
        { error: "Discipline rating must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Create trade
    const trade = await createTrade(authResult.user.userId, {
      date: new Date(date),
      time,
      direction,
      market,
      entryPrice: parseFloat(entryPrice),
      accountBalance: parseFloat(accountBalance),
      positionSize: parseFloat(positionSize),
      stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      takeProfitPrice: takeProfitPrice
        ? parseFloat(takeProfitPrice)
        : undefined,
      tradeCosts: tradeCosts ? parseFloat(tradeCosts) : 0,
      riskRewardRatio,
      tradeNotes,
      disciplineRating: disciplineRating
        ? parseInt(disciplineRating)
        : undefined,
      emotionalState,
      strategy,
      setup,
      analysisId,
      tradeScreenshot,
      tags,
    });

    logger.info("Trade created successfully", {
      tradeId: trade.id,
      market: trade.market,
      direction: trade.direction
    });

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    logger.error("Create trade error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse(error, "Failed to create trade");
  }
}
