/**
 * Snapshot cleanup utilities
 * Common logic for maintaining snapshot limits across manual and automated snapshots
 */

import prisma from "@/lib/prisma";
import { getLogger } from "@/lib/logging";
import { getMaxSnapshotsPerLayout } from "@/lib/utils/config";

const logger = getLogger();

/**
 * Enforce snapshot limit for a layout
 * Deletes oldest snapshots until count is under the limit (leaving room for a new one)
 *
 * This ensures that:
 * - If limit is 4 and there are 5 snapshots, it deletes 2 (leaving 3, so new one makes 4)
 * - If limit is 4 and there are 4 snapshots, it deletes 1 (leaving 3, so new one makes 4)
 * - If limit is 4 and there are 3 snapshots, it deletes 0 (new one makes 4)
 *
 * @param layoutId - Database ID of the layout
 * @returns Number of snapshots deleted
 */
export async function enforceSnapshotLimit(layoutId: string): Promise<number> {
  const maxSnapshotsPerLayout = getMaxSnapshotsPerLayout();

  // Get all existing snapshots for this layout, ordered by oldest first
  let existingSnapshots = await prisma.snapshot.findMany({
    where: { layoutId },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });

  const initialCount = existingSnapshots.length;
  const targetCount = maxSnapshotsPerLayout - 1; // Leave room for the new snapshot
  const needToDelete = Math.max(0, initialCount - targetCount);

  logger.info("Enforcing snapshot limit", {
    layoutId,
    currentCount: initialCount,
    maxLimit: maxSnapshotsPerLayout,
    targetCount,
    willDelete: needToDelete,
  });

  let deletedCount = 0;

  // Delete oldest snapshots until we're at target count
  while (existingSnapshots.length > targetCount) {
    const oldestSnapshot = existingSnapshots[0];

    logger.info("Deleting oldest snapshot to maintain limit", {
      layoutId,
      deletedSnapshotId: oldestSnapshot.id,
      snapshotCreatedAt: oldestSnapshot.createdAt,
      currentCount: existingSnapshots.length,
      maxLimit: maxSnapshotsPerLayout,
      remaining: existingSnapshots.length - 1,
    });

    await prisma.snapshot.delete({
      where: { id: oldestSnapshot.id },
    });

    deletedCount++;
    existingSnapshots = existingSnapshots.slice(1);
  }

  if (deletedCount > 0) {
    logger.info("Snapshot cleanup completed", {
      layoutId,
      deletedCount,
      remainingCount: existingSnapshots.length,
      newSnapshotWillMakeTotal: existingSnapshots.length + 1,
    });
  }

  return deletedCount;
}
