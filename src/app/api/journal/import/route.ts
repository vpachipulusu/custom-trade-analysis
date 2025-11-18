import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { importJournalFromExcel } from "@/lib/utils/excelImport";
import {
  createTrade,
  closeTrade,
  updateJournalSettings,
  recalculateMonthlyStats,
} from "@/lib/db/journal";
import { getLogger, LogContext } from "@/lib/logging";

export async function POST(request: NextRequest) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for logging
    LogContext.set({ userId: authResult.user.userId });

    const userId = authResult.user.userId;

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel
    const { trades, settings, errors } = await importJournalFromExcel(buffer);

    if (errors.length > 0 && trades.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to parse Excel file",
          errors,
        },
        { status: 400 }
      );
    }

    // Update journal settings
    if (settings.startingBalance > 0 || settings.currentBalance > 0) {
      await updateJournalSettings(userId, {
        startingBalance: settings.startingBalance,
        currentBalance: settings.currentBalance,
      });
    }

    // Import trades
    let importedCount = 0;
    let failedCount = 0;
    const importErrors: string[] = [...errors];

    for (const tradeData of trades) {
      try {
        // Create trade
        const trade = await createTrade(userId, {
          date: tradeData.date,
          time: tradeData.time,
          direction: tradeData.direction,
          market: tradeData.market,
          entryPrice: tradeData.entryPrice,
          accountBalance: tradeData.accountBalance,
          positionSize: tradeData.positionSize,
          stopLossPrice: tradeData.stopLossPrice,
          takeProfitPrice: tradeData.takeProfitPrice,
          tradeCosts: tradeData.tradeCosts,
          tradeNotes: tradeData.tradeNotes,
          disciplineRating: tradeData.disciplineRating,
          emotionalState: tradeData.emotionalState,
        });

        // If trade is closed, close it
        if (
          tradeData.status === "closed" &&
          tradeData.actualExitPrice &&
          tradeData.closedPositionPL !== undefined
        ) {
          await closeTrade(trade.id, {
            actualExitPrice: tradeData.actualExitPrice,
            exitDate: tradeData.exitDate || tradeData.date,
            exitTime: tradeData.exitTime || tradeData.time,
            closedPositionPL: tradeData.closedPositionPL,
            accountChangePercent: tradeData.accountChangePercent || 0,
          });
        }

        importedCount++;
      } catch (error) {
        failedCount++;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        importErrors.push(
          `Failed to import trade (${tradeData.market} ${tradeData.date}): ${message}`
        );
      }
    }

    // Recalculate all monthly stats
    const uniqueMonths = new Set(
      trades.map((t) => `${t.date.getFullYear()}-${t.date.getMonth() + 1}`)
    );

    for (const monthKey of uniqueMonths) {
      const [year, month] = monthKey.split("-").map(Number);
      try {
        await recalculateMonthlyStats(userId, year, month);
      } catch (error) {
        logger.error("Failed to recalculate stats", {
          year,
          month,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info("Journal import completed", {
      total: trades.length,
      imported: importedCount,
      failed: failedCount
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: trades.length,
        imported: importedCount,
        failed: failedCount,
      },
      errors: importErrors.length > 0 ? importErrors : undefined,
    });
  } catch (error) {
    logger.error("Import error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: "Failed to import journal" },
      { status: 500 }
    );
  }
}
