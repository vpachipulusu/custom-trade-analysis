import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Unauthorized: Missing or invalid auth header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);

    // Get user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      console.log(`❌ User not found for firebaseUid: ${decodedToken.uid}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const limit = parseInt(searchParams.get("limit") || "50");

    console.log(
      `📋 Fetching logs for scheduleId: ${scheduleId}, userId: ${user.id}`
    );

    const where: any = {};
    if (scheduleId) {
      // Verify the schedule belongs to the user
      const schedule = await prisma.automationSchedule.findFirst({
        where: {
          id: scheduleId,
          userId: user.id,
        },
      });

      console.log(`🔍 Schedule found:`, !!schedule);

      if (!schedule) {
        console.log(`❌ Schedule not found or doesn't belong to user`);
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

      console.log(`📊 Found ${schedules.length} schedules for user`);

      where.scheduleId = {
        in: schedules.map((s) => s.id),
      };
    }

    console.log(`🔎 Querying logs with where:`, where);

    const logs = await prisma.automationJobLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    console.log(`✅ Found ${logs.length} logs`);

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("❌ Error fetching automation logs:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
