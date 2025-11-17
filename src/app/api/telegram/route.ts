import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";

/**
 * GET /api/telegram
 * Get Telegram configuration for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const config = await prisma.telegramConfig.findUnique({
      where: { userId: authResult.user.userId },
    });

    return NextResponse.json(config || null);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

/**
 * POST /api/telegram
 * Create or update Telegram configuration
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const {
      chatId,
      username,
      isActive,
      includeChart,
      includeEconomic,
      notifyOnHold,
    } = body;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.telegramConfig.findUnique({
      where: { userId: authResult.user.userId },
    });

    let config;
    if (existingConfig) {
      // Update
      config = await prisma.telegramConfig.update({
        where: { userId: authResult.user.userId },
        data: {
          chatId,
          username: username || null,
          isActive: isActive ?? true,
          includeChart: includeChart ?? true,
          includeEconomic: includeEconomic ?? true,
          notifyOnHold: notifyOnHold ?? false,
          verifiedAt: new Date(),
        },
      });
    } else {
      // Create
      config = await prisma.telegramConfig.create({
        data: {
          userId: authResult.user.userId,
          chatId,
          username: username || null,
          isActive: isActive ?? true,
          includeChart: includeChart ?? true,
          includeEconomic: includeEconomic ?? true,
          notifyOnHold: notifyOnHold ?? false,
          verifiedAt: new Date(),
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
