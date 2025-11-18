import prisma from "../prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { Trade } from "@prisma/client";

// ==================== JOURNAL SETTINGS ====================

export async function getOrCreateJournalSettings(userId: string) {
  let settings = await prisma.journalSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.journalSettings.create({
      data: {
        userId,
        startingBalance: new Decimal(0),
        currentBalance: new Decimal(0),
        currency: "GBP",
      },
    });
  }

  return settings;
}

export async function updateJournalSettings(
  userId: string,
  data: {
    startingBalance?: number;
    currentBalance?: number;
    currency?: string;
    timezone?: string;
    defaultPositionSize?: number;
    defaultRiskPercent?: number;
  }
) {
  const updateData: any = {};

  if (data.startingBalance !== undefined) {
    updateData.startingBalance = new Decimal(data.startingBalance);
  }
  if (data.currentBalance !== undefined) {
    updateData.currentBalance = new Decimal(data.currentBalance);
  }
  if (data.currency !== undefined) {
    updateData.currency = data.currency;
  }
  if (data.timezone !== undefined) {
    updateData.timezone = data.timezone;
  }
  if (data.defaultPositionSize !== undefined) {
    updateData.defaultPositionSize = new Decimal(data.defaultPositionSize);
  }
  if (data.defaultRiskPercent !== undefined) {
    updateData.defaultRiskPercent = new Decimal(data.defaultRiskPercent);
  }

  return await prisma.journalSettings.update({
    where: { userId },
    data: updateData,
  });
}

// ==================== TRADES ====================

export async function createTrade(
  userId: string,
  tradeData: {
    date: Date;
    time: string;
    direction: string;
    market: string;
    entryPrice: number;
    accountBalance: number;
    positionSize: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    tradeCosts?: number;
    tradeNotes?: string;
    disciplineRating?: number;
    emotionalState?: string;
    strategy?: string;
    setup?: string;
    analysisId?: string;
    tradeScreenshot?: string;
    tags?: any;
  }
) {
  const trade = await prisma.trade.create({
    data: {
      userId,
      date: tradeData.date,
      time: tradeData.time,
      direction: tradeData.direction,
      market: tradeData.market,
      entryPrice: new Decimal(tradeData.entryPrice),
      accountBalance: new Decimal(tradeData.accountBalance),
      positionSize: new Decimal(tradeData.positionSize),
      stopLossPrice: tradeData.stopLossPrice
        ? new Decimal(tradeData.stopLossPrice)
        : null,
      takeProfitPrice: tradeData.takeProfitPrice
        ? new Decimal(tradeData.takeProfitPrice)
        : null,
      tradeCosts: tradeData.tradeCosts
        ? new Decimal(tradeData.tradeCosts)
        : new Decimal(0),
      tradeNotes: tradeData.tradeNotes,
      disciplineRating: tradeData.disciplineRating,
      emotionalState: tradeData.emotionalState,
      strategy: tradeData.strategy,
      setup: tradeData.setup,
      analysisId: tradeData.analysisId,
      tradeScreenshot: tradeData.tradeScreenshot,
      tags: tradeData.tags,
      status: "open",
    },
  });

  return trade;
}

export async function closeTrade(
  tradeId: string,
  closeData: {
    actualExitPrice: number;
    exitDate: Date;
    exitTime: string;
    closedPositionPL: number;
    accountChangePercent: number;
  }
) {
  // Get the trade first to access userId
  const existingTrade = await prisma.trade.findUnique({
    where: { id: tradeId },
  });

  if (!existingTrade) {
    throw new Error("Trade not found");
  }

  // Close the trade
  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      actualExitPrice: new Decimal(closeData.actualExitPrice),
      exitDate: closeData.exitDate,
      exitTime: closeData.exitTime,
      closedPositionPL: new Decimal(closeData.closedPositionPL),
      accountChangePercent: new Decimal(closeData.accountChangePercent),
      status: "closed",
    },
  });

  // Update journal settings current balance
  const settings = await getOrCreateJournalSettings(existingTrade.userId);
  await updateJournalSettings(existingTrade.userId, {
    currentBalance:
      settings.currentBalance.toNumber() + closeData.closedPositionPL,
  });

  // Recalculate monthly stats
  await recalculateMonthlyStats(
    existingTrade.userId,
    trade.date.getFullYear(),
    trade.date.getMonth() + 1
  );

  return trade;
}

export async function getUserTrades(
  userId: string,
  filters?: {
    status?: string;
    market?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { userId };

  if (filters?.status) where.status = filters.status;
  if (filters?.market) where.market = filters.market;
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  return await prisma.trade.findMany({
    where,
    orderBy: { date: "desc" },
    take: filters?.limit || 100,
    skip: filters?.offset || 0,
    include: {
      analysis: {
        select: {
          id: true,
          action: true,
          confidence: true,
        },
      },
    },
  });
}

export async function getTradeById(tradeId: string) {
  return await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      analysis: {
        include: {
          snapshot: {
            select: {
              imageData: true,
              url: true,
            },
          },
        },
      },
    },
  });
}

export async function updateTrade(tradeId: string, updateData: Partial<Trade>) {
  return await prisma.trade.update({
    where: { id: tradeId },
    data: updateData,
  });
}

export async function deleteTrade(tradeId: string) {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });

  await prisma.trade.delete({
    where: { id: tradeId },
  });

  // Recalculate monthly stats
  if (trade) {
    await recalculateMonthlyStats(
      trade.userId,
      trade.date.getFullYear(),
      trade.date.getMonth() + 1
    );
  }
}

// ==================== MONTHLY STATS ====================

export async function recalculateMonthlyStats(
  userId: string,
  year: number,
  month: number
) {
  // Get all closed trades for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: "closed",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (trades.length === 0) {
    // No trades this month, ensure stats are zeroed
    await prisma.monthlyStats.upsert({
      where: {
        userId_year_month: { userId, year, month },
      },
      create: {
        userId,
        year,
        month,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        winRate: new Decimal(0),
        totalPL: new Decimal(0),
        totalTradeCosts: new Decimal(0),
      },
      update: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        winRate: new Decimal(0),
        totalPL: new Decimal(0),
        totalTradeCosts: new Decimal(0),
      },
    });
    return;
  }

  // Calculate statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(
    (t) => t.closedPositionPL && t.closedPositionPL.toNumber() > 0
  );
  const losingTrades = trades.filter(
    (t) => t.closedPositionPL && t.closedPositionPL.toNumber() < 0
  );
  const breakEvenTrades = trades.filter(
    (t) => t.closedPositionPL && t.closedPositionPL.toNumber() === 0
  );

  const totalPL = trades.reduce(
    (sum, t) => sum + (t.closedPositionPL?.toNumber() || 0),
    0
  );
  const totalCosts = trades.reduce(
    (sum, t) => sum + t.tradeCosts.toNumber(),
    0
  );

  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce(
          (sum, t) => sum + (t.closedPositionPL?.toNumber() || 0),
          0
        ) / winningTrades.length
      : null;

  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce(
          (sum, t) => sum + (t.closedPositionPL?.toNumber() || 0),
          0
        ) / losingTrades.length
      : null;

  const largestWin =
    winningTrades.length > 0
      ? Math.max(
          ...winningTrades.map((t) => t.closedPositionPL?.toNumber() || 0)
        )
      : null;

  const largestLoss =
    losingTrades.length > 0
      ? Math.min(
          ...losingTrades.map((t) => t.closedPositionPL?.toNumber() || 0)
        )
      : null;

  const averagePLPerTrade = totalPL / totalTrades;
  const winRate = (winningTrades.length / totalTrades) * 100;

  // Calculate average risk and reward
  const avgRisk =
    trades.reduce((sum, t) => {
      if (t.stopLossPrice && t.entryPrice && t.positionSize) {
        const risk =
          Math.abs(t.entryPrice.toNumber() - t.stopLossPrice.toNumber()) *
          t.positionSize.toNumber();
        const riskPercent = (risk / t.accountBalance.toNumber()) * 100;
        return sum + riskPercent;
      }
      return sum;
    }, 0) / totalTrades;

  const avgReward =
    trades.reduce((sum, t) => {
      if (t.closedPositionPL && t.accountBalance) {
        return (
          sum +
          Math.abs(
            (t.closedPositionPL.toNumber() / t.accountBalance.toNumber()) * 100
          )
        );
      }
      return sum;
    }, 0) / totalTrades;

  // Calculate R:R ratio
  const avgRRRatio =
    avgRisk > 0 ? `1:${(avgReward / avgRisk).toFixed(2)}` : null;

  // Calculate ROI
  const settings = await getOrCreateJournalSettings(userId);
  const roi =
    settings.startingBalance.toNumber() > 0
      ? (totalPL / settings.startingBalance.toNumber()) * 100
      : 0;

  // Upsert monthly stats
  await prisma.monthlyStats.upsert({
    where: {
      userId_year_month: { userId, year, month },
    },
    create: {
      userId,
      year,
      month,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      winRate: new Decimal(winRate),
      totalPL: new Decimal(totalPL),
      averageWin: averageWin ? new Decimal(averageWin) : null,
      averageLoss: averageLoss ? new Decimal(averageLoss) : null,
      largestWin: largestWin ? new Decimal(largestWin) : null,
      largestLoss: largestLoss ? new Decimal(largestLoss) : null,
      averagePLPerTrade: new Decimal(averagePLPerTrade),
      totalTradeCosts: new Decimal(totalCosts),
      averageRiskPerTrade: new Decimal(avgRisk),
      averageRewardPerTrade: new Decimal(avgReward),
      averageRiskRewardRatio: avgRRRatio,
      returnOnInvestment: new Decimal(roi),
    },
    update: {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      winRate: new Decimal(winRate),
      totalPL: new Decimal(totalPL),
      averageWin: averageWin ? new Decimal(averageWin) : null,
      averageLoss: averageLoss ? new Decimal(averageLoss) : null,
      largestWin: largestWin ? new Decimal(largestWin) : null,
      largestLoss: largestLoss ? new Decimal(largestLoss) : null,
      averagePLPerTrade: new Decimal(averagePLPerTrade),
      totalTradeCosts: new Decimal(totalCosts),
      averageRiskPerTrade: new Decimal(avgRisk),
      averageRewardPerTrade: new Decimal(avgReward),
      averageRiskRewardRatio: avgRRRatio,
      returnOnInvestment: new Decimal(roi),
    },
  });
}

export async function getMonthlyStats(userId: string, year: number) {
  return await prisma.monthlyStats.findMany({
    where: { userId, year },
    orderBy: { month: "asc" },
  });
}

export async function getAllTimeStats(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { userId, status: "closed" },
  });

  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      totalPL: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      totalCosts: 0,
      averagePLPerTrade: 0,
      roi: 0,
      avgRisk: 0,
      avgReward: 0,
      avgRRRatio: "0:0",
    };
  }

  // Similar calculations as monthly stats but for all time
  const totalTrades = trades.length;
  const winningTrades = trades.filter(
    (t) => t.closedPositionPL && t.closedPositionPL.toNumber() > 0
  );
  const losingTrades = trades.filter(
    (t) => t.closedPositionPL && t.closedPositionPL.toNumber() < 0
  );
  const breakEvenTrades = trades.filter(
    (t) => t.closedPositionPL && t.closedPositionPL.toNumber() === 0
  );

  const totalPL = trades.reduce(
    (sum, t) => sum + (t.closedPositionPL?.toNumber() || 0),
    0
  );
  const totalCosts = trades.reduce(
    (sum, t) => sum + t.tradeCosts.toNumber(),
    0
  );

  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce(
          (sum, t) => sum + (t.closedPositionPL?.toNumber() || 0),
          0
        ) / winningTrades.length
      : 0;

  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce(
          (sum, t) => sum + (t.closedPositionPL?.toNumber() || 0),
          0
        ) / losingTrades.length
      : 0;

  const largestWin =
    winningTrades.length > 0
      ? Math.max(
          ...winningTrades.map((t) => t.closedPositionPL?.toNumber() || 0)
        )
      : 0;

  const largestLoss =
    losingTrades.length > 0
      ? Math.min(
          ...losingTrades.map((t) => t.closedPositionPL?.toNumber() || 0)
        )
      : 0;

  const averagePLPerTrade = totalPL / totalTrades;

  // Calculate average risk and reward
  const avgRisk =
    trades.reduce((sum, t) => {
      if (t.stopLossPrice && t.entryPrice && t.positionSize) {
        const risk =
          Math.abs(t.entryPrice.toNumber() - t.stopLossPrice.toNumber()) *
          t.positionSize.toNumber();
        const riskPercent = (risk / t.accountBalance.toNumber()) * 100;
        return sum + riskPercent;
      }
      return sum;
    }, 0) / totalTrades;

  const avgReward =
    trades.reduce((sum, t) => {
      if (t.closedPositionPL && t.accountBalance) {
        return (
          sum +
          Math.abs(
            (t.closedPositionPL.toNumber() / t.accountBalance.toNumber()) * 100
          )
        );
      }
      return sum;
    }, 0) / totalTrades;

  const avgRRRatio =
    avgRisk > 0 ? `1:${(avgReward / avgRisk).toFixed(2)}` : "0:0";

  const settings = await getOrCreateJournalSettings(userId);
  const roi =
    settings.startingBalance.toNumber() > 0
      ? (totalPL / settings.startingBalance.toNumber()) * 100
      : 0;

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate: (winningTrades.length / totalTrades) * 100,
    totalPL,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    totalCosts,
    averagePLPerTrade,
    roi,
    avgRisk,
    avgReward,
    avgRRRatio,
  };
}
