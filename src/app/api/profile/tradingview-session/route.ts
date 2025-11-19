import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { updateUser } from "@/lib/db/users";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger } from "@/lib/logging";

/**
 * PATCH /api/profile/tradingview-session
 * Update TradingView session credentials for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { sessionId, sessionIdSign } = body;

    // Validate input
    if (!sessionId || !sessionIdSign) {
      return NextResponse.json(
        { error: "Both sessionId and sessionIdSign are required" },
        { status: 400 }
      );
    }

    // Update user's TradingView session credentials
    await updateUser(authResult.user.userId, {
      tvSessionId: sessionId,
      tvSessionIdSign: sessionIdSign,
    });

    logger.info("TradingView session credentials updated", {
      userId: authResult.user.userId,
    });

    return NextResponse.json({
      message: "TradingView session credentials updated successfully"
    });
  } catch (error) {
    logger.error("Failed to update TradingView session", {
      error: error instanceof Error ? error.message : String(error),
    });
    return createErrorResponse(error, 500);
  }
}

/**
 * GET /api/profile/tradingview-session
 * Get TradingView session status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { getUserById } = await import("@/lib/db/users");
    const user = await getUserById(authResult.user.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hasSession: !!(user.tvSessionId && user.tvSessionIdSign),
      sessionId: user.tvSessionId ? "***" + user.tvSessionId.slice(-4) : null,
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
