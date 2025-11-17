/**
 * Database operations for Economic Context table
 */

import { prisma } from "@/lib/prisma";

export interface CreateEconomicContextData {
  analysisId: string;
  symbol: string;
  upcomingEvents: any[];
  weeklyEvents: any[];
  immediateRisk: string;
  weeklyOutlook: string;
  impactSummary: string;
  warnings: string[];
  opportunities: string[];
  recommendation?: string;
}

/**
 * Create a new economic context
 */
export async function createEconomicContext(data: CreateEconomicContextData) {
  try {
    const context = await prisma.economicContext.create({
      data: {
        analysisId: data.analysisId,
        symbol: data.symbol,
        upcomingEvents: data.upcomingEvents,
        weeklyEvents: data.weeklyEvents,
        immediateRisk: data.immediateRisk,
        weeklyOutlook: data.weeklyOutlook,
        impactSummary: data.impactSummary,
        warnings: data.warnings,
        opportunities: data.opportunities,
        recommendation: data.recommendation,
      },
    });

    console.log(
      `[DB] Created economic context for analysis ${data.analysisId}`
    );
    return context;
  } catch (error) {
    console.error("[DB] Error creating economic context:", error);
    throw error;
  }
}

/**
 * Get economic context by analysis ID
 */
export async function getEconomicContextByAnalysisId(analysisId: string) {
  try {
    const context = await prisma.economicContext.findUnique({
      where: { analysisId },
    });

    return context;
  } catch (error) {
    console.error("[DB] Error fetching economic context:", error);
    return null;
  }
}

/**
 * Update economic context
 */
export async function updateEconomicContext(
  id: string,
  data: Partial<CreateEconomicContextData>
) {
  try {
    const context = await prisma.economicContext.update({
      where: { id },
      data: {
        symbol: data.symbol,
        upcomingEvents: data.upcomingEvents,
        weeklyEvents: data.weeklyEvents,
        immediateRisk: data.immediateRisk,
        weeklyOutlook: data.weeklyOutlook,
        impactSummary: data.impactSummary,
        warnings: data.warnings,
        opportunities: data.opportunities,
        recommendation: data.recommendation,
      },
    });

    console.log(`[DB] Updated economic context ${id}`);
    return context;
  } catch (error) {
    console.error("[DB] Error updating economic context:", error);
    throw error;
  }
}

/**
 * Delete economic context
 */
export async function deleteEconomicContext(id: string) {
  try {
    await prisma.economicContext.delete({
      where: { id },
    });

    console.log(`[DB] Deleted economic context ${id}`);
  } catch (error) {
    console.error("[DB] Error deleting economic context:", error);
    throw error;
  }
}
