import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import prisma from "@/lib/prisma";
import { getLogger, LogContext } from "@/lib/logging";

export async function GET(request: NextRequest) {
  const logger = getLogger();

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Unauthorized: Missing or invalid auth header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      logger.warn("User not found", { firebaseUid: decodedToken.uid });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    LogContext.set({ userId: user.id });

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const limit = parseInt(searchParams.get("limit") || "50");

    logger.info("Fetching automation logs", {
      scheduleId,
      userId: user.id,
      limit
    });

    const where: any = {};
    if (scheduleId) {
      // Verify the schedule belongs to the user
      const schedule = await prisma.automationSchedule.findFirst({
        where: {
          id: scheduleId,
          userId: user.id,
        },
      });

      logger.debug("Schedule lookup result", {
        scheduleId,
        found: !!schedule
      });

      if (!schedule) {
        logger.warn("Schedule not found or doesn't belong to user", {
          scheduleId,
          userId: user.id
        });
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      where.scheduleId = scheduleId;
    } else {
      // Get all schedules for the user
      const schedules = await prisma.automationSchedule.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      logger.debug("Found schedules for user", {
        userId: user.id,
        count: schedules.length
      });

      where.scheduleId = {
        in: schedules.map((s) => s.id),
      };
    }

    logger.debug("Querying automation logs", { where });

    const logs = await prisma.automationJobLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    logger.info("Automation logs fetched successfully", {
      count: logs.length,
      scheduleId,
      userId: user.id
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    logger.error("Error fetching automation logs", {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
