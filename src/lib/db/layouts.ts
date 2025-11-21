import { prisma } from "@/lib/prisma";
import { Layout } from "@prisma/client";

export interface CreateLayoutData {
  layoutId?: string | null;
  symbol?: string | null;
  interval?: string | null;
}

export interface UpdateLayoutData {
  layoutId?: string | null;
  symbol?: string | null;
  interval?: string | null;
}

/**
 * Create a new layout
 */
export async function createLayout(
  userId: string,
  data: CreateLayoutData
): Promise<Layout> {
  return await prisma.layout.create({
    data: {
      userId,
      layoutId: data.layoutId,
      symbol: data.symbol,
      interval: data.interval,
    },
  });
}

/**
 * Get all layouts for a user
 */
export async function getLayoutsByUserId(userId: string) {
  return await prisma.layout.findMany({
    where: { userId },
    include: {
      snapshots: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get layout by ID
 */
export async function getLayoutById(id: string): Promise<Layout | null> {
  return await prisma.layout.findUnique({
    where: { id },
    include: {
      user: true,
      snapshots: true,
    },
  });
}

/**
 * Update layout
 */
export async function updateLayout(
  id: string,
  data: UpdateLayoutData
): Promise<Layout> {
  return await prisma.layout.update({
    where: { id },
    data: {
      layoutId: data.layoutId,
      symbol: data.symbol,
      interval: data.interval,
    },
  });
}

/**
 * Delete layout (will cascade delete snapshots and analyses)
 */
export async function deleteLayout(id: string): Promise<void> {
  await prisma.layout.delete({
    where: { id },
  });
}

/**
 * Get all layouts for a specific symbol by user
 */
export async function getLayoutsBySymbol(
  userId: string,
  symbol: string
) {
  return await prisma.layout.findMany({
    where: {
      userId,
      symbol: {
        equals: symbol,
        mode: "insensitive", // Case-insensitive search
      },
    },
    include: {
      snapshots: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1, // Get only the latest snapshot
      },
    },
    orderBy: {
      interval: "asc", // Order by timeframe (D, 240, 60, etc.)
    },
  });
}

/**
 * Count layouts for a specific symbol by user
 */
export async function countLayoutsBySymbol(
  userId: string,
  symbol: string
): Promise<number> {
  return await prisma.layout.count({
    where: {
      userId,
      symbol: {
        equals: symbol,
        mode: "insensitive", // Case-insensitive search
      },
    },
  });
}
