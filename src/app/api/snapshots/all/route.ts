import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/lib/logging";

// DELETE /api/snapshots/all - Delete all snapshots for the authenticated user
export async function DELETE(req: NextRequest) {
  const logger = getLogger();

  try {
    const user = await authenticateRequest(req);

    // Get all layouts for the user
    const layouts = await prisma.layout.findMany({
      where: { userId: user.userId },
      select: { id: true },
    });

    const layoutIds = layouts.map((l) => l.id);

    // Delete all snapshots for all user layouts
    const result = await prisma.snapshot.deleteMany({
      where: {
        layoutId: {
          in: layoutIds,
        },
      },
    });

    logger.info("All snapshots deleted for user", {
      userId: user.userId,
      layoutCount: layoutIds.length,
      snapshotCount: result.count,
    });

    return NextResponse.json({
      message: "All snapshots deleted successfully",
      count: result.count,
    });
  } catch (error) {
    logger.error("Failed to delete all snapshots", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete snapshots" },
      { status: 500 }
    );
  }
}
