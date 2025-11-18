import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

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
    console.error("Debug error:", error);
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

    return NextResponse.json({ success: true, message: "All data cleared" });
  } catch (error) {
    console.error("Debug delete error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
