import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";

/**
 * GET /api/automation
 * Get all automation schedules for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const schedules = await prisma.automationSchedule.findMany({
      where: { userId: authResult.user.userId },
      include: {
        layout: {
          select: {
            id: true,
            layoutId: true,
            symbol: true,
            interval: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

/**
 * POST /api/automation
 * Create or update automation schedule for a layout
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const {
      layoutId,
      enabled,
      frequency,
      sendToTelegram,
      onlyOnSignalChange,
      minConfidence,
      sendOnHold,
    } = body;

    if (!layoutId) {
      return NextResponse.json(
        { error: "Layout ID is required" },
        { status: 400 }
      );
    }

    // Verify layout belongs to user
    const layout = await prisma.layout.findFirst({
      where: {
        id: layoutId,
        userId: authResult.user.userId,
      },
    });

    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Check if schedule already exists
    const existingSchedule = await prisma.automationSchedule.findUnique({
      where: { layoutId },
    });

    let schedule;
    if (existingSchedule) {
      // Update existing
      schedule = await prisma.automationSchedule.update({
        where: { layoutId },
        data: {
          enabled: enabled ?? existingSchedule.enabled,
          frequency: frequency ?? existingSchedule.frequency,
          sendToTelegram: sendToTelegram ?? existingSchedule.sendToTelegram,
          onlyOnSignalChange:
            onlyOnSignalChange ?? existingSchedule.onlyOnSignalChange,
          minConfidence: minConfidence ?? existingSchedule.minConfidence,
          sendOnHold: sendOnHold ?? existingSchedule.sendOnHold,
          nextRunAt: new Date(), // Reset to run soon
        },
        include: {
          layout: {
            select: {
              id: true,
              layoutId: true,
              symbol: true,
              interval: true,
            },
          },
        },
      });
    } else {
      // Create new
      schedule = await prisma.automationSchedule.create({
        data: {
          userId: authResult.user.userId,
          layoutId,
          enabled: enabled ?? true,
          frequency: frequency ?? "1h",
          sendToTelegram: sendToTelegram ?? true,
          onlyOnSignalChange: onlyOnSignalChange ?? false,
          minConfidence: minConfidence ?? 50,
          sendOnHold: sendOnHold ?? false,
          nextRunAt: new Date(),
        },
        include: {
          layout: {
            select: {
              id: true,
              layoutId: true,
              symbol: true,
              interval: true,
            },
          },
        },
      });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
