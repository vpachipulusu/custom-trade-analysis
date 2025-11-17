import { prisma } from "@/lib/prisma";
import { Analysis } from "@prisma/client";

export interface CreateAnalysisData {
  action: string;
  confidence: number;
  timeframe: string;
  reasons: string[];
}

export interface AnalysisWithRelations extends Analysis {
  snapshot: {
    url: string;
    layout: {
      symbol: string | null;
      interval: string | null;
    };
  };
}

/**
 * Create a new analysis
 */
export async function createAnalysis(
  userId: string,
  snapshotId: string,
  data: CreateAnalysisData
): Promise<Analysis> {
  return await prisma.analysis.create({
    data: {
      userId,
      snapshotId,
      action: data.action,
      confidence: data.confidence,
      timeframe: data.timeframe,
      reasons: data.reasons,
    },
  });
}

/**
 * Get paginated analyses for a user
 */
export async function getAnalysesByUserId(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ analyses: AnalysisWithRelations[]; total: number }> {
  const skip = (page - 1) * limit;

  const [analyses, total] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId },
      include: {
        snapshot: {
          include: {
            layout: {
              select: {
                symbol: true,
                interval: true,
              },
            },
          },
        },
        economicContext: true, // Include economic context
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.analysis.count({
      where: { userId },
    }),
  ]);

  return { analyses: analyses as AnalysisWithRelations[], total };
}

/**
 * Get analysis by ID
 */
export async function getAnalysisById(
  id: string
): Promise<AnalysisWithRelations | null> {
  return (await prisma.analysis.findUnique({
    where: { id },
    include: {
      snapshot: {
        include: {
          layout: {
            select: {
              symbol: true,
              interval: true,
            },
          },
        },
      },
      user: true,
      economicContext: true, // Include economic context
    },
  })) as AnalysisWithRelations | null;
}

/**
 * Get analysis by snapshot ID
 */
export async function getAnalysisBySnapshotId(
  snapshotId: string
): Promise<Analysis | null> {
  return await prisma.analysis.findUnique({
    where: { snapshotId },
  });
}

/**
 * Update analysis
 */
export async function updateAnalysis(
  id: string,
  data: CreateAnalysisData
): Promise<Analysis> {
  return await prisma.analysis.update({
    where: { id },
    data: {
      action: data.action,
      confidence: data.confidence,
      timeframe: data.timeframe,
      reasons: data.reasons,
    },
  });
}
