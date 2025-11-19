import { prisma } from "@/lib/prisma";
import { Snapshot } from "@prisma/client";

/**
 * Create a new snapshot
 */
export async function createSnapshot(
  layoutId: string,
  url: string,
  expiresAt: Date
): Promise<Snapshot> {
  return await prisma.snapshot.create({
    data: {
      layoutId,
      url,
      expiresAt,
    },
  });
}

/**
 * Get snapshot by ID
 */
export async function getSnapshotById(id: string) {
  return await prisma.snapshot.findUnique({
    where: { id },
    include: {
      layout: {
        include: {
          user: true,
        },
      },
      analysis: true,
    },
  });
}

/**
 * Get all snapshots for a layout
 */
export async function getSnapshotsByLayoutId(
  layoutId: string
): Promise<Snapshot[]> {
  return await prisma.snapshot.findMany({
    where: { layoutId },
    include: {
      analysis: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Delete snapshot
 */
export async function deleteSnapshot(id: string): Promise<void> {
  await prisma.snapshot.delete({
    where: { id },
  });
}
