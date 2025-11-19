import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getTradeById, closeTrade } from "@/lib/db/journal";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { Decimal } from "@prisma/client/runtime/library";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * POST /api/journal/trades/[id]/close
 * Close an open trade
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const params = await context.params;

    // Verify ownership and trade is open
    const existingTrade = await getTradeById(params.id);
    if (!existingTrade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existingTrade.userId !== authResult.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (existingTrade.status !== "open") {
      return NextResponse.json({ error: "Trade is not open" }, { status: 400 });
    }

    const body = await request.json();
    const { actualExitPrice, exitDate, exitTime } = body;

    // Validation
    if (!actualExitPrice || !exitDate || !exitTime) {
      return NextResponse.json(
        {
          error: "Missing required fields: actualExitPrice, exitDate, exitTime",
        },
        { status: 400 }
      );
    }

    // Calculate P/L
    const entryPrice = existingTrade.entryPrice.toNumber();
    const exitPrice = parseFloat(actualExitPrice);
    const positionSize = existingTrade.positionSize.toNumber();
    const tradeCosts = existingTrade.tradeCosts.toNumber();

    const logger = getLogger();
    LogContext.set({ userId: authResult.user.userId });

    logger.debug("Close trade calculation", {
      tradeId: params.id,
      direction: existingTrade.direction,
      entryPrice,
      exitPrice,
      positionSize,
      tradeCosts,
    });

    let closedPositionPL: number;
    if (existingTrade.direction === "Long") {
      closedPositionPL = (exitPrice - entryPrice) * positionSize - tradeCosts;
    } else {
      // Short
      closedPositionPL = (entryPrice - exitPrice) * positionSize - tradeCosts;
    }

    logger.debug("Calculated P/L", { tradeId: params.id, pl: closedPositionPL });

    // Calculate account change %
    const accountBalance = existingTrade.accountBalance.toNumber();
    const accountChangePercent = (closedPositionPL / accountBalance) * 100;

    // Close the trade
    const trade = await closeTrade(params.id, {
      actualExitPrice: exitPrice,
      exitDate: new Date(exitDate),
      exitTime,
      closedPositionPL,
      accountChangePercent,
    });

    // Update current balance
    const { prisma } = await import("@/lib/prisma");
    const settings = await prisma.journalSettings.findUnique({
      where: { userId: authResult.user.userId },
    });

    if (settings) {
      const newBalance = settings.currentBalance.toNumber() + closedPositionPL;
      await prisma.journalSettings.update({
        where: { userId: authResult.user.userId },
        data: { currentBalance: new Decimal(newBalance) },
      });
    }

    // Recalculate monthly stats for the month this trade was closed
    const { recalculateMonthlyStats } = await import("@/lib/db/journal");
    const exitDateObj = new Date(exitDate);
    const year = exitDateObj.getFullYear();
    const month = exitDateObj.getMonth() + 1;
    await recalculateMonthlyStats(authResult.user.userId, year, month);

    logger.info("Trade closed successfully", {
      tradeId: params.id,
      pl: closedPositionPL,
      accountChange: accountChangePercent
    });

    return NextResponse.json({
      trade,
      calculatedPL: closedPositionPL,
      calculatedAccountChange: accountChangePercent,
    });
  } catch (error) {
    const logger = getLogger();
    logger.error("Close trade error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse(error, 500);
  }
}
