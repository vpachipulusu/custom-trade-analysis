import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { testTelegramConnection } from "@/lib/services/telegram";

/**
 * POST /api/telegram/test
 * Test Telegram connection by sending a test message
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const success = await testTelegramConnection({ chatId });

    return NextResponse.json({ success });
  } catch (error: any) {
    return createErrorResponse(error, 500);
  }
}
