import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";
import { processAutomationJob } from "@/lib/jobs/autoAnalysis";
import { decrypt } from "@/lib/utils/encryption";
import { getLogger } from "@/lib/logging";

/**
 * POST /api/automation/[id]
 * Manually trigger a specific automation job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;

    // Fetch the schedule with all required data
    const schedule = await prisma.automationSchedule.findFirst({
      where: {
        id,
        userId: authResult.user.userId,
      },
      include: {
        layout: true,
        user: {
          include: {
            telegramConfig: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    if (!schedule.enabled) {
      return NextResponse.json(
        { error: "Schedule is disabled" },
        { status: 400 }
      );
    }

    if (!schedule.user.sessionid) {
      return NextResponse.json(
        { error: "User session ID not configured. Please update your Dashboard Settings." },
        { status: 400 }
      );
    }

    logger.info("Manual trigger for single automation job", {
      scheduleId: schedule.id,
      layoutId: schedule.layoutId,
      symbol: schedule.layout.symbol,
      interval: schedule.layout.interval,
    });

    // Build the automation job
    const job = {
      scheduleId: schedule.id,
      userId: schedule.userId,
      layoutId: schedule.layoutId,
      layoutIdTradingView: schedule.layout.layoutId,
      symbol: schedule.layout.symbol,
      interval: schedule.layout.interval,
      sessionId: schedule.user.sessionid,
      sessionidSign: schedule.user.sessionidSign,
      telegramChatId: schedule.user.telegramConfig?.chatId,
      includeChart: schedule.user.telegramConfig?.includeChart ?? true,
      includeEconomic: schedule.user.telegramConfig?.includeEconomic ?? true,
      onlyOnSignalChange: schedule.onlyOnSignalChange,
      minConfidence: schedule.minConfidence,
      sendOnHold: schedule.sendOnHold,
      defaultAiModel: schedule.user.defaultAiModel || "gpt-4o",
    };

    // Process the job
    await processAutomationJob(job);

    return NextResponse.json({
      success: true,
      message: "Automation job triggered successfully",
    });
  } catch (error) {
    logger.error("Failed to trigger single automation job", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse(error, 500);
  }
}

/**
 * DELETE /api/automation/[id]
 * Delete an automation schedule
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

    const { id } = params;

    // Verify schedule belongs to user
    const schedule = await prisma.automationSchedule.findFirst({
      where: {
        id,
        userId: authResult.user.userId,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    await prisma.automationSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
