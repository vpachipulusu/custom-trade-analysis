import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/lib/logging";

// DELETE /api/layouts/:id/snapshots - Delete all snapshots for a specific layout
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getLogger();

  try {
    const user = await authenticateRequest(req);
    const layoutId = params.id;

    // Verify the layout belongs to the user
    const layout = await prisma.layout.findUnique({
      where: { id: layoutId },
    });

    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    if (layout.userId !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all snapshots for this layout
    const result = await prisma.snapshot.deleteMany({
      where: { layoutId },
    });

    logger.info("All snapshots deleted for layout", {
      layoutId,
      userId: user.userId,
      count: result.count,
    });

    return NextResponse.json({
      message: "All snapshots deleted successfully",
      count: result.count,
    });
  } catch (error) {
    logger.error("Failed to delete all snapshots for layout", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete snapshots" },
      { status: 500 }
    );
  }
}
