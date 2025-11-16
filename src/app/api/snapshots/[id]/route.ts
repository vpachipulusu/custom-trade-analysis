import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getSnapshotById, deleteSnapshot } from "@/lib/db/snapshots";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * DELETE /api/snapshots/[id]
 * Delete a snapshot
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

    // Get snapshot and verify ownership
    const snapshot = await getSnapshotById(id);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    if (
      !snapshot.layout?.user ||
      !verifyOwnership(authResult.user.userId, snapshot.layout.user.id)
    ) {
      return NextResponse.json(
        { error: "You do not have permission to delete this snapshot" },
        { status: 403 }
      );
    }

    // Delete snapshot (cascades to analysis)
    await deleteSnapshot(id);

    return NextResponse.json(
      { message: "Snapshot deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
