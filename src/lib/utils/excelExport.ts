import ExcelJS from "exceljs";
import { Trade, MonthlyStats, JournalSettings } from "@prisma/client";

interface AllTimeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPL: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalCosts: number;
  avgPLPerTrade: number;
  roi: number;
  avgRisk: number;
  avgReward: number;
  avgRRRatio: string;
}

function calculateAllTimeStats(
  trades: Trade[],
  settings: JournalSettings
): AllTimeStats {
  const closedTrades = trades.filter((t) => t.status === "closed");

  if (closedTrades.length === 0) {
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
      avgPLPerTrade: 0,
      roi: 0,
      avgRisk: 0,
      avgReward: 0,
      avgRRRatio: "0:0",
    };
  }

  const winningTrades = closedTrades.filter(
    (t) => t.closedPositionPL && Number(t.closedPositionPL) > 0
  );
  const losingTrades = closedTrades.filter(
    (t) => t.closedPositionPL && Number(t.closedPositionPL) < 0
  );
  const breakEvenTrades = closedTrades.filter(
    (t) => t.closedPositionPL && Number(t.closedPositionPL) === 0
  );

  const totalPL = closedTrades.reduce(
    (sum, t) => sum + (Number(t.closedPositionPL) || 0),
    0
  );
  const totalCosts = closedTrades.reduce(
    (sum, t) => sum + Number(t.tradeCosts),
    0
  );

  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce(
          (sum, t) => sum + (Number(t.closedPositionPL) || 0),
          0
        ) / winningTrades.length
      : 0;

  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce(
          (sum, t) => sum + (Number(t.closedPositionPL) || 0),
          0
        ) / losingTrades.length
      : 0;

  const largestWin =
    winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => Number(t.closedPositionPL) || 0))
      : 0;

  const largestLoss =
    losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => Number(t.closedPositionPL) || 0))
      : 0;

  const avgRisk =
    closedTrades.reduce((sum, t) => {
      if (t.stopLossPrice && t.entryPrice && t.positionSize) {
        const risk =
          Math.abs(Number(t.entryPrice) - Number(t.stopLossPrice)) *
          Number(t.positionSize);
        const riskPercent = (risk / Number(t.accountBalance)) * 100;
        return sum + riskPercent;
      }
      return sum;
    }, 0) / closedTrades.length;

  const avgReward =
    closedTrades.reduce((sum, t) => {
      if (t.closedPositionPL && t.accountBalance) {
        return (
          sum +
          Math.abs(
            (Number(t.closedPositionPL) / Number(t.accountBalance)) * 100
          )
        );
      }
      return sum;
    }, 0) / closedTrades.length;

  const avgRRRatio =
    avgRisk > 0 ? `1:${(avgReward / avgRisk).toFixed(2)}` : "0:0";

  const roi =
    Number(settings.startingBalance) > 0
      ? (totalPL / Number(settings.startingBalance)) * 100
      : 0;

  return {
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate: (winningTrades.length / closedTrades.length) * 100,
    totalPL,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    totalCosts,
    avgPLPerTrade: totalPL / closedTrades.length,
    roi,
    avgRisk,
    avgReward,
    avgRRRatio,
  };
}

export async function exportJournalToExcel(
  trades: Trade[],
  monthlyStats: MonthlyStats[],
  settings: JournalSettings
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // ==================== SHEET 1: Trade Log ====================
  const tradeLogSheet = workbook.addWorksheet("Trade Log");

  // Add header with account info
  tradeLogSheet.getCell("A1").value = "Starting Account Balance";
  tradeLogSheet.getCell("B1").value = Number(settings.startingBalance);
  tradeLogSheet.getCell("B1").numFmt = "£#,##0.00";

  tradeLogSheet.getCell("A2").value = "Closed Position P/L";
  const totalPL = trades
    .filter((t) => t.status === "closed")
    .reduce((sum, t) => sum + (Number(t.closedPositionPL) || 0), 0);
  tradeLogSheet.getCell("B2").value = totalPL;
  tradeLogSheet.getCell("B2").numFmt = "£#,##0.00";

  tradeLogSheet.getCell("A3").value = "Account Balance";
  tradeLogSheet.getCell("B3").value = Number(settings.currentBalance);
  tradeLogSheet.getCell("B3").numFmt = "£#,##0.00";

  // Add column headers (row 5)
  const headers = [
    "Date",
    "Time",
    "Long/Short",
    "Market",
    "Entry Price",
    "Account Balance",
    "Position Size",
    "Stop Loss Price",
    "Take Profit Price",
    "Actual Exit Price",
    "Trade Costs",
    "Risk : Reward Ratio",
    "Closed Position P/L",
    "Account Change %",
    "Trade Screenshot",
    "Trade Notes",
    "Discipline Rating",
    "Emotional State of Mind",
  ];

  tradeLogSheet.getRow(5).values = headers;

  // Style header row
  tradeLogSheet.getRow(5).font = { bold: true };
  tradeLogSheet.getRow(5).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };

  // Add trade data (starting from row 6)
  trades.forEach((trade, index) => {
    const row = tradeLogSheet.getRow(6 + index);
    row.values = [
      trade.date,
      trade.time,
      trade.direction,
      trade.market,
      Number(trade.entryPrice),
      Number(trade.accountBalance),
      Number(trade.positionSize),
      trade.stopLossPrice ? Number(trade.stopLossPrice) : null,
      trade.takeProfitPrice ? Number(trade.takeProfitPrice) : null,
      trade.actualExitPrice ? Number(trade.actualExitPrice) : null,
      Number(trade.tradeCosts),
      trade.riskRewardRatio,
      trade.closedPositionPL ? Number(trade.closedPositionPL) : null,
      trade.accountChangePercent ? Number(trade.accountChangePercent) : null,
      trade.tradeScreenshot,
      trade.tradeNotes,
      trade.disciplineRating,
      trade.emotionalState,
    ];

    // Format currency cells
    row.getCell(5).numFmt = "#,##0.00000000";
    row.getCell(6).numFmt = "£#,##0.00";
    row.getCell(7).numFmt = "#,##0.00000000";
    row.getCell(8).numFmt = "#,##0.00000000";
    row.getCell(9).numFmt = "#,##0.00000000";
    row.getCell(10).numFmt = "#,##0.00000000";
    row.getCell(11).numFmt = "£#,##0.00";
    row.getCell(13).numFmt = "£#,##0.00";
    row.getCell(14).numFmt = "0.00%";

    // Color code P/L
    if (trade.closedPositionPL) {
      const plCell = row.getCell(13);
      if (Number(trade.closedPositionPL) > 0) {
        plCell.font = { color: { argb: "FF00B050" } }; // Green
      } else if (Number(trade.closedPositionPL) < 0) {
        plCell.font = { color: { argb: "FFFF0000" } }; // Red
      }
    }
  });

  // Auto-fit columns
  tradeLogSheet.columns.forEach((column, index) => {
    if (index === 15) {
      // Notes column
      column.width = 30;
    } else {
      column.width = 15;
    }
  });

  // ==================== SHEET 2: Trade Summary ====================
  const summarySheet = workbook.addWorksheet("Trade Summary");

  // Calculate all-time stats
  const allTimeStats = calculateAllTimeStats(trades, settings);

  // Left side - Overall Summary
  summarySheet.getCell("A1").value = "Trade Summary";
  summarySheet.getCell("A1").font = { bold: true, size: 14 };

  summarySheet.getCell("A3").value = "Total Number of Trades";
  summarySheet.getCell("B3").value = allTimeStats.totalTrades;

  summarySheet.getCell("A4").value = "Total Number of Winning Trades";
  summarySheet.getCell("B4").value = allTimeStats.winningTrades;

  summarySheet.getCell("A5").value = "Total Number of Losing Trades";
  summarySheet.getCell("B5").value = allTimeStats.losingTrades;

  summarySheet.getCell("A6").value = "Total Number of Break Even Trades";
  summarySheet.getCell("B6").value = allTimeStats.breakEvenTrades;

  summarySheet.getCell("A7").value = "Trade Win Rate";
  summarySheet.getCell("B7").value = allTimeStats.winRate / 100;
  summarySheet.getCell("B7").numFmt = "0.00%";

  summarySheet.getCell("A9").value = "Average Winning Trade";
  summarySheet.getCell("B9").value = allTimeStats.averageWin;
  summarySheet.getCell("B9").numFmt = "£#,##0.00";

  summarySheet.getCell("A10").value = "Average Losing Trade";
  summarySheet.getCell("B10").value = allTimeStats.averageLoss;
  summarySheet.getCell("B10").numFmt = "£#,##0.00";

  summarySheet.getCell("A12").value = "Largest Winning Trade";
  summarySheet.getCell("B12").value = allTimeStats.largestWin;
  summarySheet.getCell("B12").numFmt = "£#,##0.00";

  summarySheet.getCell("A13").value = "Largest Losing Trade";
  summarySheet.getCell("B13").value = allTimeStats.largestLoss;
  summarySheet.getCell("B13").numFmt = "£#,##0.00";

  summarySheet.getCell("A15").value = "Total Trade Costs";
  summarySheet.getCell("B15").value = allTimeStats.totalCosts;
  summarySheet.getCell("B15").numFmt = "£#,##0.00";

  summarySheet.getCell("A17").value = "Total P/L";
  summarySheet.getCell("B17").value = allTimeStats.totalPL;
  summarySheet.getCell("B17").numFmt = "£#,##0.00";

  summarySheet.getCell("A18").value = "Average P/L Per Trade";
  summarySheet.getCell("B18").value = allTimeStats.avgPLPerTrade;
  summarySheet.getCell("B18").numFmt = "£#,##0.00";

  summarySheet.getCell("A20").value = "Return On Investment";
  summarySheet.getCell("B20").value = allTimeStats.roi / 100;
  summarySheet.getCell("B20").numFmt = "0.00%";

  summarySheet.getCell("A22").value = "Ave Risk Per Trade";
  summarySheet.getCell("B22").value = allTimeStats.avgRisk / 100;
  summarySheet.getCell("B22").numFmt = "0.00%";

  summarySheet.getCell("A23").value = "Average Reward Per Trade";
  summarySheet.getCell("B23").value = allTimeStats.avgReward / 100;
  summarySheet.getCell("B23").numFmt = "0.00%";

  summarySheet.getCell("A24").value = "Average Risk:Reward";
  summarySheet.getCell("B24").value = allTimeStats.avgRRRatio;

  // Right side - Month On Month Analysis
  summarySheet.getCell("D1").value = "Month On Month Analysis";
  summarySheet.getCell("D1").font = { bold: true, size: 14 };

  // Headers: Year | Jan | Feb | ... | Dec
  const monthHeaders = [
    "Metric",
    "Year",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let currentRow = 3;
  summarySheet.getRow(currentRow).values = monthHeaders.map((h, i) =>
    i === 0 ? "" : h
  );
  summarySheet.getRow(currentRow).font = { bold: true };
  summarySheet.getRow(currentRow).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };

  // Get unique years from monthly stats
  const years = [...new Set(monthlyStats.map((s) => s.year))].sort();

  // Metrics to display
  const metrics = [
    { label: "Total Number of Trades", key: "totalTrades" },
    { label: "Total Number of Winning Trades", key: "winningTrades" },
    { label: "Total Number of Losing Trades", key: "losingTrades" },
    { label: "Total Number of Break Even Trades", key: "breakEvenTrades" },
    { label: "Trade Win Rate", key: "winRate", format: "percent" },
    { label: "Average Winning Trade", key: "averageWin", format: "currency" },
    { label: "Average Losing Trade", key: "averageLoss", format: "currency" },
    { label: "Largest Winning Trade", key: "largestWin", format: "currency" },
    { label: "Largest Losing Trade", key: "largestLoss", format: "currency" },
    { label: "Total Trade Costs", key: "totalTradeCosts", format: "currency" },
    { label: "Total P/L", key: "totalPL", format: "currency" },
    {
      label: "Average P/L Per Trade",
      key: "averagePLPerTrade",
      format: "currency",
    },
    {
      label: "Ave Risk Per Trade",
      key: "averageRiskPerTrade",
      format: "percent",
    },
    {
      label: "Average Reward Per Trade",
      key: "averageRewardPerTrade",
      format: "percent",
    },
    { label: "Average Risk:Reward", key: "averageRiskRewardRatio" },
  ];

  years.forEach((year) => {
    currentRow++;
    metrics.forEach((metric, metricIndex) => {
      const row = summarySheet.getRow(currentRow + metricIndex);

      // Metric label column
      row.getCell(1).value = metric.label;
      row.getCell(1).font = { bold: true };

      // Year column
      row.getCell(2).value = year;

      // Month columns (3-14)
      for (let month = 1; month <= 12; month++) {
        const stat = monthlyStats.find(
          (s) => s.year === year && s.month === month
        );
        const cellValue = stat ? (stat as any)[metric.key] : null;

        const cell = row.getCell(2 + month);
        if (cellValue !== null && cellValue !== undefined) {
          if (metric.format === "currency") {
            cell.value = Number(cellValue);
            cell.numFmt = "£#,##0.00";
          } else if (metric.format === "percent") {
            cell.value = Number(cellValue) / 100;
            cell.numFmt = "0.00%";
          } else {
            cell.value =
              typeof cellValue === "string" ? cellValue : Number(cellValue);
          }
        }
      }
    });

    currentRow += metrics.length + 1; // Add spacing between years
  });

  // Auto-fit columns
  summarySheet.columns.forEach((column, index) => {
    if (index === 0) {
      column.width = 30;
    } else {
      column.width = 15;
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
