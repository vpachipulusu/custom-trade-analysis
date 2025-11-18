import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import {
  getUserTrades,
  getMonthlyStats,
  getOrCreateJournalSettings,
} from "@/lib/db/journal";
import { exportJournalToExcel } from "@/lib/utils/excelExport";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const userId = authResult.user.userId;

    // Get all trades
    const trades = await getUserTrades(userId, { limit: 10000 });

    // Get journal settings
    const settings = await getOrCreateJournalSettings(userId);

    // Get monthly stats for all years
    const currentYear = new Date().getFullYear();
    const years = [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ];

    let allMonthlyStats: any[] = [];
    for (const year of years) {
      const yearStats = await getMonthlyStats(userId, year);
      allMonthlyStats = [...allMonthlyStats, ...yearStats];
    }

    // Generate Excel file
    const buffer = await exportJournalToExcel(
      trades,
      allMonthlyStats,
      settings
    );

    // Return file
    const fileName = `trading-journal-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export journal" },
      { status: 500 }
    );
  }
}
