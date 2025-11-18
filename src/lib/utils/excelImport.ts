import ExcelJS from "exceljs";

interface ImportedTrade {
  date: Date;
  time: string;
  direction: string;
  market: string;
  entryPrice: number;
  accountBalance: number;
  positionSize: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  actualExitPrice?: number;
  tradeCosts: number;
  riskRewardRatio?: string;
  closedPositionPL?: number;
  accountChangePercent?: number;
  tradeScreenshot?: string;
  tradeNotes?: string;
  disciplineRating?: number;
  emotionalState?: string;
  status: string;
  exitDate?: Date;
  exitTime?: string;
}

interface ImportSettings {
  startingBalance: number;
  currentBalance: number;
}

export async function importJournalFromExcel(buffer: Buffer): Promise<{
  trades: ImportedTrade[];
  settings: ImportSettings;
  errors: string[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const errors: string[] = [];
  const trades: ImportedTrade[] = [];
  let settings: ImportSettings = {
    startingBalance: 0,
    currentBalance: 0,
  };

  // Parse Trade Log sheet
  const tradeLogSheet = workbook.getWorksheet("Trade Log");
  if (!tradeLogSheet) {
    errors.push("Trade Log sheet not found");
    return { trades, settings, errors };
  }

  // Get account settings from header
  try {
    const startingBalanceValue = tradeLogSheet.getCell("B1").value;
    const currentBalanceValue = tradeLogSheet.getCell("B3").value;

    settings.startingBalance =
      typeof startingBalanceValue === "number"
        ? startingBalanceValue
        : parseFloat(String(startingBalanceValue || 0));

    settings.currentBalance =
      typeof currentBalanceValue === "number"
        ? currentBalanceValue
        : parseFloat(String(currentBalanceValue || 0));
  } catch (error) {
    errors.push("Error reading account settings from Excel");
  }

  // Parse trades (starting from row 6)
  let rowIndex = 6;
  while (rowIndex < 10000) {
    // Safety limit
    const row = tradeLogSheet.getRow(rowIndex);
    const dateCell = row.getCell(1).value;

    if (!dateCell) break; // End of trades

    try {
      // Parse date
      let tradeDate: Date;
      if (dateCell instanceof Date) {
        tradeDate = dateCell;
      } else if (typeof dateCell === "number") {
        // Excel serial date
        tradeDate = new Date((dateCell - 25569) * 86400 * 1000);
      } else if (typeof dateCell === "string") {
        tradeDate = new Date(dateCell);
      } else {
        throw new Error("Invalid date format");
      }

      const timeValue = row.getCell(2).value;
      const direction = String(row.getCell(3).value || "").trim();
      const market = String(row.getCell(4).value || "").trim();

      // Validate required fields
      if (!direction || !market) {
        errors.push(`Row ${rowIndex}: Missing direction or market`);
        rowIndex++;
        continue;
      }

      if (!["Long", "Short"].includes(direction)) {
        errors.push(
          `Row ${rowIndex}: Direction must be "Long" or "Short", got "${direction}"`
        );
        rowIndex++;
        continue;
      }

      const entryPriceValue = row.getCell(5).value;
      const accountBalanceValue = row.getCell(6).value;
      const positionSizeValue = row.getCell(7).value;

      if (!entryPriceValue || !accountBalanceValue || !positionSizeValue) {
        errors.push(
          `Row ${rowIndex}: Missing required price/balance/size data`
        );
        rowIndex++;
        continue;
      }

      const actualExitPriceValue = row.getCell(10).value;
      const closedPositionPLValue = row.getCell(13).value;

      const trade: ImportedTrade = {
        date: tradeDate,
        time: String(timeValue || ""),
        direction,
        market,
        entryPrice: parseFloat(String(entryPriceValue)),
        accountBalance: parseFloat(String(accountBalanceValue)),
        positionSize: parseFloat(String(positionSizeValue)),
        stopLossPrice: row.getCell(8).value
          ? parseFloat(String(row.getCell(8).value))
          : undefined,
        takeProfitPrice: row.getCell(9).value
          ? parseFloat(String(row.getCell(9).value))
          : undefined,
        actualExitPrice: actualExitPriceValue
          ? parseFloat(String(actualExitPriceValue))
          : undefined,
        tradeCosts: row.getCell(11).value
          ? parseFloat(String(row.getCell(11).value))
          : 0,
        riskRewardRatio: row.getCell(12).value
          ? String(row.getCell(12).value)
          : undefined,
        closedPositionPL: closedPositionPLValue
          ? parseFloat(String(closedPositionPLValue))
          : undefined,
        accountChangePercent: row.getCell(14).value
          ? parseFloat(String(row.getCell(14).value))
          : undefined,
        tradeScreenshot: row.getCell(15).value
          ? String(row.getCell(15).value)
          : undefined,
        tradeNotes: row.getCell(16).value
          ? String(row.getCell(16).value)
          : undefined,
        disciplineRating: row.getCell(17).value
          ? parseInt(String(row.getCell(17).value))
          : undefined,
        emotionalState: row.getCell(18).value
          ? String(row.getCell(18).value)
          : undefined,
        status: actualExitPriceValue ? "closed" : "open",
        exitDate: actualExitPriceValue ? tradeDate : undefined, // Use same date as entry if no exit date specified
        exitTime: actualExitPriceValue ? String(timeValue || "") : undefined,
      };

      // Validate numbers
      if (
        isNaN(trade.entryPrice) ||
        isNaN(trade.accountBalance) ||
        isNaN(trade.positionSize)
      ) {
        errors.push(
          `Row ${rowIndex}: Invalid number format in price/balance/size`
        );
        rowIndex++;
        continue;
      }

      trades.push(trade);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error parsing row ${rowIndex}: ${message}`);
    }

    rowIndex++;
  }

  return { trades, settings, errors };
}
