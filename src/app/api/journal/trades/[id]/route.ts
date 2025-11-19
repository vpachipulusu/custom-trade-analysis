import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { getTradeById, updateTrade, deleteTrade } from "@/lib/db/journal";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";

/**
 * GET /api/journal/trades/[id]
 * Get single trade by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const trade = await getTradeById(params.id);

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    // Verify ownership
    if (trade.userId !== authResult.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ trade });
  } catch (error) {
    const logger = getLogger();
    logger.error("Get trade error", {
      error: error instanceof Error ? error.message : String(error),
      tradeId: params.id
    });
    return createErrorResponse(error, 500);
  }
}

/**
 * PATCH /api/journal/trades/[id]
 * Update trade
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Verify ownership
    const existingTrade = await getTradeById(params.id);
    if (!existingTrade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existingTrade.userId !== authResult.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // Validate direction if provided
    if (body.direction && !["Long", "Short"].includes(body.direction)) {
      return NextResponse.json(
        { error: "Direction must be Long or Short" },
        { status: 400 }
      );
    }

    // Validate discipline rating if provided
    if (
      body.disciplineRating !== undefined &&
      (body.disciplineRating < 1 || body.disciplineRating > 10)
    ) {
      return NextResponse.json(
        { error: "Discipline rating must be between 1 and 10" },
        { status: 400 }
      );
    }

    const trade = await updateTrade(params.id, body);

    return NextResponse.json({ trade });
  } catch (error) {
    const logger = getLogger();
    logger.error("Update trade error", {
      error: error instanceof Error ? error.message : String(error),
      tradeId: params.id
    });
    return createErrorResponse(error, 500);
  }
}

/**
 * DELETE /api/journal/trades/[id]
 * Delete trade
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Verify ownership
    const existingTrade = await getTradeById(params.id);
    if (!existingTrade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existingTrade.userId !== authResult.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteTrade(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const logger = getLogger();
    logger.error("Delete trade error", {
      error: error instanceof Error ? error.message : String(error),
      tradeId: params.id
    });
    return createErrorResponse(error, 500);
  }
}
