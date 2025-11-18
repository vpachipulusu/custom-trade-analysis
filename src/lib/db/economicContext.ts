/**
 * Database operations for Economic Context table
 */

import { prisma } from "@/lib/prisma";
import { getLogger } from "../logging";

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
  const logger = getLogger();
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

    logger.info("Created economic context", {
      analysisId: data.analysisId,
      symbol: data.symbol
    });
    return context;
  } catch (error) {
    logger.error("Error creating economic context", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId: data.analysisId
    });
    throw error;
  }
}

/**
 * Get economic context by analysis ID
 */
export async function getEconomicContextByAnalysisId(analysisId: string) {
  const logger = getLogger();
  try {
    const context = await prisma.economicContext.findUnique({
      where: { analysisId },
    });

    return context;
  } catch (error) {
    logger.error("Error fetching economic context", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId
    });
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
  const logger = getLogger();
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

    logger.info("Updated economic context", { id });
    return context;
  } catch (error) {
    logger.error("Error updating economic context", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      id
    });
    throw error;
  }
}

/**
 * Delete economic context
 */
export async function deleteEconomicContext(id: string) {
  const logger = getLogger();
  try {
    await prisma.economicContext.delete({
      where: { id },
    });

    logger.info("Deleted economic context", { id });
  } catch (error) {
    logger.error("Error deleting economic context", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      id
    });
    throw error;
  }
}
