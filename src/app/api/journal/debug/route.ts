import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { recalculateMonthlyStats } from "@/lib/db/journal";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * GET /api/journal/debug
 * Debug endpoint to see all trades
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const trades = await prisma.trade.findMany({
      where: { userId: authResult.user.userId },
      orderBy: { createdAt: "desc" },
    });

    const settings = await prisma.journalSettings.findUnique({
      where: { userId: authResult.user.userId },
    });

    return NextResponse.json({
      trades: trades.map((t) => ({
        id: t.id,
        date: t.date,
        market: t.market,
        direction: t.direction,
        status: t.status,
        entryPrice: t.entryPrice.toString(),
        exitPrice: t.actualExitPrice?.toString(),
        positionSize: t.positionSize.toString(),
        closedPositionPL: t.closedPositionPL?.toString(),
        createdAt: t.createdAt,
      })),
      settings: {
        startingBalance: settings?.startingBalance.toString(),
        currentBalance: settings?.currentBalance.toString(),
      },
    });
  } catch (error) {
    const logger = getLogger();
    logger.error("Debug error", {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/journal/debug
 * Delete all trades and reset balance
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Delete all trades
    await prisma.trade.deleteMany({
      where: { userId: authResult.user.userId },
    });

    // Delete all monthly stats
    await prisma.monthlyStats.deleteMany({
      where: { userId: authResult.user.userId },
    });

    // Reset balance to starting balance
    const settings = await prisma.journalSettings.findUnique({
      where: { userId: authResult.user.userId },
    });

    if (settings) {
      await prisma.journalSettings.update({
        where: { userId: authResult.user.userId },
        data: { currentBalance: settings.startingBalance },
      });
    }

    const logger = getLogger();
    logger.info("All journal data cleared");
    return NextResponse.json({ success: true, message: "All data cleared" });
  } catch (error) {
    const logger = getLogger();
    logger.error("Debug delete error", {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/journal/debug
 * Seed realistic trade data for testing
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Get user's settings
    const settings = await prisma.journalSettings.findUnique({
      where: { userId: authResult.user.userId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    const startingBalance = parseFloat(settings.startingBalance.toString());
    let currentBalance = startingBalance;

    // Comprehensive seed data covering multiple scenarios over 3 months
    const seedTrades = [
      // ============ MONTH 1: November 2024 - Learning Phase (Mixed Results) ============

      // Week 1: Starting with small wins
      {
        date: new Date("2024-11-01T09:30:00Z"),
        time: "09:30",
        direction: "Long",
        market: "GBPUSD",
        entryPrice: 1.285,
        stopLossPrice: 1.282,
        takeProfitPrice: 1.291,
        actualExitPrice: 1.291,
        exitDate: new Date("2024-11-01T14:20:00Z"),
        exitTime: "14:20",
        positionSize: 1.0,
        tradeCosts: 2.5,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.58,
        status: "closed",
        notes: "Clean breakout above resistance. Good risk:reward setup.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2024-11-04T08:15:00Z"),
        time: "08:15",
        direction: "Short",
        market: "EURUSD",
        entryPrice: 1.095,
        stopLossPrice: 1.098,
        takeProfitPrice: 1.089,
        actualExitPrice: 1.092,
        exitDate: new Date("2024-11-04T16:30:00Z"),
        exitTime: "16:30",
        positionSize: 1.2,
        tradeCosts: 2.8,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.35,
        status: "closed",
        notes: "Took profit early due to news volatility. Decent trade.",
        emotionalState: "Cautious",
        discipline: "Good",
        setup: "Reversal",
        outcome: "Partial TP",
      },

      // Week 2: First losing streak
      {
        date: new Date("2024-11-08T10:00:00Z"),
        time: "10:00",
        direction: "Long",
        market: "USDJPY",
        entryPrice: 149.5,
        stopLossPrice: 149.0,
        takeProfitPrice: 150.5,
        actualExitPrice: 149.0,
        exitDate: new Date("2024-11-08T12:45:00Z"),
        exitTime: "12:45",
        positionSize: 0.8,
        tradeCosts: 2.0,
        riskRewardRatio: "1:2.0",
        accountChangePercent: -0.4,
        status: "closed",
        notes: "Stop loss hit. Market reversed sharply after news.",
        emotionalState: "Frustrated",
        discipline: "Good",
        setup: "Trend Following",
        outcome: "Stop Loss Hit",
      },
      {
        date: new Date("2024-11-11T13:30:00Z"),
        time: "13:30",
        direction: "Short",
        market: "GBPUSD",
        entryPrice: 1.278,
        stopLossPrice: 1.282,
        takeProfitPrice: 1.27,
        actualExitPrice: 1.282,
        exitDate: new Date("2024-11-11T15:00:00Z"),
        exitTime: "15:00",
        positionSize: 1.0,
        tradeCosts: 2.5,
        riskRewardRatio: "1:2.0",
        accountChangePercent: -0.42,
        status: "closed",
        notes: "Entered against trend. Bad decision.",
        emotionalState: "Impulsive",
        discipline: "Poor",
        setup: "Reversal",
        outcome: "Stop Loss Hit",
      },

      // Week 3: Recovery with better discipline
      {
        date: new Date("2024-11-15T07:45:00Z"),
        time: "07:45",
        direction: "Long",
        market: "EURUSD",
        entryPrice: 1.088,
        stopLossPrice: 1.085,
        takeProfitPrice: 1.094,
        actualExitPrice: 1.094,
        exitDate: new Date("2024-11-15T18:20:00Z"),
        exitTime: "18:20",
        positionSize: 1.5,
        tradeCosts: 3.0,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.87,
        status: "closed",
        notes: "Excellent patience waiting for setup. Perfect execution.",
        emotionalState: "Focused",
        discipline: "Excellent",
        setup: "Support Bounce",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2024-11-18T11:00:00Z"),
        time: "11:00",
        direction: "Long",
        market: "GOLD",
        entryPrice: 1975.5,
        stopLossPrice: 1968.0,
        takeProfitPrice: 1990.5,
        actualExitPrice: 1990.5,
        exitDate: new Date("2024-11-19T09:30:00Z"),
        exitTime: "09:30",
        positionSize: 0.5,
        tradeCosts: 4.0,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.71,
        status: "closed",
        notes:
          "Great gold setup on safe-haven demand. Held overnight confidently.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Full TP Hit",
      },

      // Week 4: Mixed results but improving
      {
        date: new Date("2024-11-22T09:15:00Z"),
        time: "09:15",
        direction: "Short",
        market: "BTCUSD",
        entryPrice: 37500.0,
        stopLossPrice: 37900.0,
        takeProfitPrice: 36700.0,
        actualExitPrice: 37200.0,
        exitDate: new Date("2024-11-22T20:45:00Z"),
        exitTime: "20:45",
        positionSize: 0.05,
        tradeCosts: 5.0,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.38,
        status: "closed",
        notes:
          "Took profit early as BTC showed signs of reversal. Good decision.",
        emotionalState: "Cautious",
        discipline: "Good",
        setup: "Resistance Rejection",
        outcome: "Partial TP",
      },
      {
        date: new Date("2024-11-25T14:30:00Z"),
        time: "14:30",
        direction: "Long",
        market: "GBPJPY",
        entryPrice: 184.5,
        stopLossPrice: 183.9,
        takeProfitPrice: 185.7,
        actualExitPrice: 183.9,
        exitDate: new Date("2024-11-25T17:15:00Z"),
        exitTime: "17:15",
        positionSize: 0.7,
        tradeCosts: 2.2,
        riskRewardRatio: "1:2.0",
        accountChangePercent: -0.43,
        status: "closed",
        notes:
          "Stop loss hit. Entry was too early, should have waited for confirmation.",
        emotionalState: "Eager",
        discipline: "Fair",
        setup: "Trend Following",
        outcome: "Stop Loss Hit",
      },

      // ============ MONTH 2: December 2024 - Consistency Building ============

      // Week 1: Strong start
      {
        date: new Date("2024-12-02T08:00:00Z"),
        time: "08:00",
        direction: "Short",
        market: "EURUSD",
        entryPrice: 1.105,
        stopLossPrice: 1.109,
        takeProfitPrice: 1.097,
        actualExitPrice: 1.097,
        exitDate: new Date("2024-12-03T12:30:00Z"),
        exitTime: "12:30",
        positionSize: 1.3,
        tradeCosts: 2.9,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.93,
        status: "closed",
        notes:
          "Perfect bearish setup. ECB dovish comments helped. Held overnight.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakdown",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2024-12-05T10:30:00Z"),
        time: "10:30",
        direction: "Long",
        market: "GBPUSD",
        entryPrice: 1.265,
        stopLossPrice: 1.261,
        takeProfitPrice: 1.273,
        actualExitPrice: 1.273,
        exitDate: new Date("2024-12-05T19:45:00Z"),
        exitTime: "19:45",
        positionSize: 1.2,
        tradeCosts: 2.6,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.92,
        status: "closed",
        notes: "Strong UK data triggered the rally. Excellent entry timing.",
        emotionalState: "Focused",
        discipline: "Excellent",
        setup: "Support Bounce",
        outcome: "Full TP Hit",
      },

      // Week 2: Testing larger positions
      {
        date: new Date("2024-12-09T09:00:00Z"),
        time: "09:00",
        direction: "Long",
        market: "GOLD",
        entryPrice: 2010.0,
        stopLossPrice: 2002.0,
        takeProfitPrice: 2026.0,
        actualExitPrice: 2026.0,
        exitDate: new Date("2024-12-09T21:00:00Z"),
        exitTime: "21:00",
        positionSize: 0.6,
        tradeCosts: 4.5,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.91,
        status: "closed",
        notes:
          "Gold rallied on geopolitical tensions. Good risk management with larger size.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2024-12-12T13:15:00Z"),
        time: "13:15",
        direction: "Short",
        market: "USDJPY",
        entryPrice: 147.8,
        stopLossPrice: 148.3,
        takeProfitPrice: 146.8,
        actualExitPrice: 147.3,
        exitDate: new Date("2024-12-12T22:30:00Z"),
        exitTime: "22:30",
        positionSize: 0.9,
        tradeCosts: 2.3,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.42,
        status: "closed",
        notes: "Market stalled at half target. Took profit to secure gains.",
        emotionalState: "Cautious",
        discipline: "Good",
        setup: "Resistance Rejection",
        outcome: "Partial TP",
      },

      // Week 3: One bad trade but quick recovery
      {
        date: new Date("2024-12-16T07:30:00Z"),
        time: "07:30",
        direction: "Long",
        market: "BTCUSD",
        entryPrice: 42000.0,
        stopLossPrice: 41400.0,
        takeProfitPrice: 43200.0,
        actualExitPrice: 41400.0,
        exitDate: new Date("2024-12-16T11:45:00Z"),
        exitTime: "11:45",
        positionSize: 0.04,
        tradeCosts: 5.5,
        riskRewardRatio: "1:2.0",
        accountChangePercent: -0.28,
        status: "closed",
        notes: "Crypto flash crash. Accepted the loss quickly.",
        emotionalState: "Calm",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Stop Loss Hit",
      },
      {
        date: new Date("2024-12-18T10:45:00Z"),
        time: "10:45",
        direction: "Short",
        market: "GBPUSD",
        entryPrice: 1.259,
        stopLossPrice: 1.263,
        takeProfitPrice: 1.251,
        actualExitPrice: 1.251,
        exitDate: new Date("2024-12-19T08:20:00Z"),
        exitTime: "08:20",
        positionSize: 1.4,
        tradeCosts: 2.7,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.07,
        status: "closed",
        notes:
          "Perfect revenge trade management - waited for right setup, no emotions.",
        emotionalState: "Focused",
        discipline: "Excellent",
        setup: "Breakdown",
        outcome: "Full TP Hit",
      },

      // Week 4: Holiday period - reduced activity
      {
        date: new Date("2024-12-23T09:30:00Z"),
        time: "09:30",
        direction: "Long",
        market: "EURUSD",
        entryPrice: 1.091,
        stopLossPrice: 1.088,
        takeProfitPrice: 1.097,
        actualExitPrice: 1.094,
        exitDate: new Date("2024-12-23T16:00:00Z"),
        exitTime: "16:00",
        positionSize: 0.8,
        tradeCosts: 2.1,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.22,
        status: "closed",
        notes:
          "Low liquidity week. Closed early before holidays. Smart decision.",
        emotionalState: "Cautious",
        discipline: "Excellent",
        setup: "Support Bounce",
        outcome: "Partial TP",
      },

      // ============ MONTH 3: January 2025 - Mastery Phase ============

      // Week 1: New year, strong performance
      {
        date: new Date("2025-01-06T08:30:00Z"),
        time: "08:30",
        direction: "Long",
        market: "GOLD",
        entryPrice: 2045.0,
        stopLossPrice: 2037.0,
        takeProfitPrice: 2061.0,
        actualExitPrice: 2061.0,
        exitDate: new Date("2025-01-07T14:15:00Z"),
        exitTime: "14:15",
        positionSize: 0.7,
        tradeCosts: 4.8,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.04,
        status: "closed",
        notes:
          "New year gold rally. Perfect technical and fundamental alignment.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2025-01-09T11:00:00Z"),
        time: "11:00",
        direction: "Short",
        market: "EURUSD",
        entryPrice: 1.108,
        stopLossPrice: 1.112,
        takeProfitPrice: 1.1,
        actualExitPrice: 1.1,
        exitDate: new Date("2025-01-10T09:30:00Z"),
        exitTime: "09:30",
        positionSize: 1.5,
        tradeCosts: 3.0,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.14,
        status: "closed",
        notes: "Dollar strength trade. Held overnight with conviction.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Resistance Rejection",
        outcome: "Full TP Hit",
      },

      // Week 2: Scaling up with confidence
      {
        date: new Date("2025-01-13T09:15:00Z"),
        time: "09:15",
        direction: "Long",
        market: "GBPUSD",
        entryPrice: 1.272,
        stopLossPrice: 1.268,
        takeProfitPrice: 1.28,
        actualExitPrice: 1.28,
        exitDate: new Date("2025-01-13T20:45:00Z"),
        exitTime: "20:45",
        positionSize: 1.6,
        tradeCosts: 2.9,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.21,
        status: "closed",
        notes:
          "BoE hawkish signals. Larger position size but still within risk limits.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Support Bounce",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2025-01-16T07:45:00Z"),
        time: "07:45",
        direction: "Long",
        market: "USDJPY",
        entryPrice: 145.2,
        stopLossPrice: 144.6,
        takeProfitPrice: 146.4,
        actualExitPrice: 146.4,
        exitDate: new Date("2025-01-16T18:30:00Z"),
        exitTime: "18:30",
        positionSize: 1.1,
        tradeCosts: 2.5,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.38,
        status: "closed",
        notes: "Risk-off sentiment drove yen weakness. Perfect timing.",
        emotionalState: "Focused",
        discipline: "Excellent",
        setup: "Trend Following",
        outcome: "Full TP Hit",
      },

      // Week 3: Maintaining streak
      {
        date: new Date("2025-01-20T10:00:00Z"),
        time: "10:00",
        direction: "Short",
        market: "GOLD",
        entryPrice: 2078.0,
        stopLossPrice: 2086.0,
        takeProfitPrice: 2062.0,
        actualExitPrice: 2062.0,
        exitDate: new Date("2025-01-21T15:20:00Z"),
        exitTime: "15:20",
        positionSize: 0.65,
        tradeCosts: 4.9,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 0.97,
        status: "closed",
        notes: "Gold profit-taking after rally. Excellent reversal setup.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Resistance Rejection",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2025-01-23T13:30:00Z"),
        time: "13:30",
        direction: "Long",
        market: "BTCUSD",
        entryPrice: 43800.0,
        stopLossPrice: 43200.0,
        takeProfitPrice: 45000.0,
        actualExitPrice: 45000.0,
        exitDate: new Date("2025-01-24T11:00:00Z"),
        exitTime: "11:00",
        positionSize: 0.045,
        tradeCosts: 6.0,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.15,
        status: "closed",
        notes:
          "Bitcoin ETF inflows driving price. Rode the momentum perfectly.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Full TP Hit",
      },

      // Week 4: One loss, quick recovery
      {
        date: new Date("2025-01-27T08:15:00Z"),
        time: "08:15",
        direction: "Short",
        market: "GBPJPY",
        entryPrice: 186.5,
        stopLossPrice: 187.1,
        takeProfitPrice: 185.3,
        actualExitPrice: 187.1,
        exitDate: new Date("2025-01-27T12:30:00Z"),
        exitTime: "12:30",
        positionSize: 0.75,
        tradeCosts: 2.4,
        riskRewardRatio: "1:2.0",
        accountChangePercent: -0.47,
        status: "closed",
        notes: "False breakdown. Accepted loss quickly without hesitation.",
        emotionalState: "Calm",
        discipline: "Excellent",
        setup: "Breakdown",
        outcome: "Stop Loss Hit",
      },
      {
        date: new Date("2025-01-29T09:45:00Z"),
        time: "09:45",
        direction: "Long",
        market: "EURUSD",
        entryPrice: 1.095,
        stopLossPrice: 1.0915,
        takeProfitPrice: 1.102,
        actualExitPrice: 1.102,
        exitDate: new Date("2025-01-30T16:00:00Z"),
        exitTime: "16:00",
        positionSize: 1.55,
        tradeCosts: 3.1,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.03,
        status: "closed",
        notes:
          "Bounced back immediately with disciplined setup. No revenge trading.",
        emotionalState: "Focused",
        discipline: "Excellent",
        setup: "Support Bounce",
        outcome: "Full TP Hit",
      },

      // ============ CURRENT MONTH: November 2025 - Recent Activity ============

      {
        date: new Date("2025-11-04T10:30:00Z"),
        time: "10:30",
        direction: "Long",
        market: "GBPUSD",
        entryPrice: 1.288,
        stopLossPrice: 1.2845,
        takeProfitPrice: 1.295,
        actualExitPrice: 1.295,
        exitDate: new Date("2025-11-05T14:20:00Z"),
        exitTime: "14:20",
        positionSize: 1.65,
        tradeCosts: 2.95,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.09,
        status: "closed",
        notes: "Strong UK GDP data. Perfect breakout setup.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Breakout",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2025-11-08T08:00:00Z"),
        time: "08:00",
        direction: "Short",
        market: "GOLD",
        entryPrice: 2095.0,
        stopLossPrice: 2103.0,
        takeProfitPrice: 2079.0,
        actualExitPrice: 2079.0,
        exitDate: new Date("2025-11-09T13:45:00Z"),
        exitTime: "13:45",
        positionSize: 0.7,
        tradeCosts: 5.2,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.04,
        status: "closed",
        notes: "Gold correction after reaching resistance. Well-timed short.",
        emotionalState: "Focused",
        discipline: "Excellent",
        setup: "Resistance Rejection",
        outcome: "Full TP Hit",
      },
      {
        date: new Date("2025-11-12T11:15:00Z"),
        time: "11:15",
        direction: "Long",
        market: "EURUSD",
        entryPrice: 1.102,
        stopLossPrice: 1.0985,
        takeProfitPrice: 1.109,
        actualExitPrice: 1.109,
        exitDate: new Date("2025-11-13T09:30:00Z"),
        exitTime: "09:30",
        positionSize: 1.6,
        tradeCosts: 3.2,
        riskRewardRatio: "1:2.0",
        accountChangePercent: 1.06,
        status: "closed",
        notes:
          "ECB hawkish tone supported euro strength. Excellent hold overnight.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Support Bounce",
        outcome: "Full TP Hit",
      },

      // Current open trade
      {
        date: new Date("2025-11-15T09:00:00Z"),
        time: "09:00",
        direction: "Long",
        market: "USDJPY",
        entryPrice: 148.5,
        stopLossPrice: 147.9,
        takeProfitPrice: 150.7,
        positionSize: 1.2,
        tradeCosts: 2.7,
        riskRewardRatio: "1:3.67",
        status: "open",
        notes: "Yen weakness on BoJ dovish stance. Holding for larger move.",
        emotionalState: "Confident",
        discipline: "Excellent",
        setup: "Trend Following",
      },
    ];

    // Create all trades and calculate P/L
    for (const tradeData of seedTrades) {
      let closedPL = null;
      let accountChange = null;

      if (tradeData.status === "closed" && tradeData.actualExitPrice) {
        const accountBalance = currentBalance;
        const entry = tradeData.entryPrice;
        const exit = tradeData.actualExitPrice;
        const size = tradeData.positionSize;
        const costs = tradeData.tradeCosts;

        // Calculate P/L based on direction
        let grossPL: number;
        if (tradeData.direction === "Long") {
          grossPL = (exit - entry) * size;
        } else {
          grossPL = (entry - exit) * size;
        }

        const netPL = grossPL - costs;
        closedPL = netPL;
        accountChange = (netPL / accountBalance) * 100;
        currentBalance += netPL;
      }

      await prisma.trade.create({
        data: {
          userId: authResult.user.userId,
          date: tradeData.date,
          time: tradeData.time,
          direction: tradeData.direction,
          market: tradeData.market,
          entryPrice: new Decimal(tradeData.entryPrice),
          accountBalance: new Decimal(
            tradeData.status === "open"
              ? currentBalance
              : currentBalance - (closedPL || 0)
          ),
          positionSize: new Decimal(tradeData.positionSize),
          stopLossPrice: tradeData.stopLossPrice
            ? new Decimal(tradeData.stopLossPrice)
            : null,
          takeProfitPrice: tradeData.takeProfitPrice
            ? new Decimal(tradeData.takeProfitPrice)
            : null,
          actualExitPrice: tradeData.actualExitPrice
            ? new Decimal(tradeData.actualExitPrice)
            : null,
          exitDate: tradeData.exitDate || null,
          exitTime: tradeData.exitTime || null,
          tradeCosts: new Decimal(tradeData.tradeCosts),
          riskRewardRatio: tradeData.riskRewardRatio || null,
          closedPositionPL: closedPL ? new Decimal(closedPL) : null,
          accountChangePercent: accountChange
            ? new Decimal(accountChange)
            : null,
          status: tradeData.status,
          tradeNotes: tradeData.notes || null,
          emotionalState: tradeData.emotionalState || null,
          disciplineRating:
            tradeData.discipline === "Excellent"
              ? 9
              : tradeData.discipline === "Good"
              ? 7
              : tradeData.discipline === "Fair"
              ? 5
              : tradeData.discipline === "Poor"
              ? 3
              : null,
          setup: tradeData.setup || null,
          tags: tradeData.outcome ? [tradeData.outcome] : undefined,
        },
      });
    }

    // Update current balance
    await prisma.journalSettings.update({
      where: { userId: authResult.user.userId },
      data: { currentBalance: new Decimal(currentBalance) },
    });

    // Recalculate monthly stats for all affected months
    const monthsToRecalculate = new Set<string>();
    for (const trade of seedTrades) {
      if (trade.status === "closed") {
        const year = trade.date.getFullYear();
        const month = trade.date.getMonth() + 1;
        monthsToRecalculate.add(`${year}-${month}`);
      }
    }

    // Recalculate stats for each unique month
    for (const monthKey of monthsToRecalculate) {
      const [year, month] = monthKey.split("-").map(Number);
      await recalculateMonthlyStats(authResult.user.userId, year, month);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${seedTrades.length} trades`,
      stats: {
        totalTrades: seedTrades.length,
        closedTrades: seedTrades.filter((t) => t.status === "closed").length,
        openTrades: seedTrades.filter((t) => t.status === "open").length,
        finalBalance: currentBalance.toFixed(2),
        profit: (currentBalance - startingBalance).toFixed(2),
        monthsRecalculated: monthsToRecalculate.size,
      },
    });
  } catch (error) {
    const logger = getLogger();
    logger.error("Seed error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
