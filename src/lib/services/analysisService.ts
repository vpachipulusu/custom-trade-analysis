/**
 * Shared analysis service for both automated and manual analysis
 * Extracts common logic for chart analysis, economic context, and AI model selection
 */

import prisma from "@/lib/prisma";
import * as aiService from "@/lib/services/aiService";
import {
  fetchEconomicEvents,
  filterEventsByTimeframe,
  parseSymbolCurrencies,
} from "@/lib/services/economicCalendar";
import {
  createEconomicContext,
  getEconomicContextByAnalysisId,
} from "@/lib/db/economicContext";
import {
  createAnalysis,
  getAnalysisBySnapshotId,
  updateAnalysis,
} from "@/lib/db/analyses";
import { getLogger } from "@/lib/logging";
import type { AnalysisResult } from "@/lib/services/openai";

const logger = getLogger();

/**
 * AI Model configuration
 */
export interface AIModelConfig {
  provider: "openai" | "gemini" | "claude" | "deepseek";
  modelId: string;
  modelName: string;
}

/**
 * Parse AI model string into configuration
 * Format: "provider:modelId" or just "modelId"
 */
export function parseAIModel(aiModel?: string): AIModelConfig {
  if (!aiModel) {
    return {
      provider: "openai",
      modelId: "gpt-4o",
      modelName: "OpenAI GPT-4o",
    };
  }

  let provider: AIModelConfig["provider"];
  let modelId: string;
  let modelName: string;

  if (aiModel.includes(":")) {
    const [providerStr, model] = aiModel.split(":");
    provider = providerStr as AIModelConfig["provider"];
    modelId = model;
  } else {
    // Infer provider from model ID
    modelId = aiModel;
    if (aiModel.includes("gemini")) {
      provider = "gemini";
    } else if (aiModel.includes("claude")) {
      provider = "claude";
    } else if (aiModel.includes("deepseek")) {
      provider = "deepseek";
    } else {
      provider = "openai";
    }
  }

  // Generate model name
  if (provider === "gemini") {
    modelName = "Google Gemini 2.5 Flash";
  } else if (provider === "claude") {
    modelName = "Anthropic Claude 3.5 Sonnet";
  } else if (provider === "deepseek") {
    modelName = "DeepSeek";
  } else {
    modelName = modelId.includes("mini") ? "OpenAI GPT-4o Mini" : "OpenAI GPT-4o";
  }

  return { provider, modelId, modelName };
}

/**
 * Enrich analysis with economic context
 * Fetches economic events and creates AI-powered economic impact analysis
 */
export async function enrichWithEconomicContext(params: {
  symbol: string;
  analysisId: string;
  action: string;
  confidence: number;
  aiProvider?: "openai" | "gemini" | "claude" | "deepseek";
}): Promise<any | null> {
  const { symbol, analysisId, action, confidence, aiProvider = "openai" } = params;

  try {
    logger.info("Fetching economic context", { symbol, analysisId });

    const { currencies, countries } = parseSymbolCurrencies(symbol);

    const now = new Date();
    const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allEvents = await fetchEconomicEvents({
      startDate: oneHourBefore,
      endDate: sevenDaysAhead,
      countries: countries.length > 0 ? countries : undefined,
      currencies: currencies.length > 0 ? currencies : undefined,
    });

    const { upcomingEvents, weeklyEvents } = filterEventsByTimeframe(
      allEvents,
      now
    );

    // Only create economic context if there are events
    if (upcomingEvents.length > 0 || weeklyEvents.length > 0) {
      logger.info("Found economic events", {
        symbol,
        upcomingCount: upcomingEvents.length,
        weeklyCount: weeklyEvents.length,
      });

      // Get AI analysis of economic impact
      const economicImpact = await aiService.analyzeEconomicImpact(
        {
          symbol,
          action: action as "BUY" | "SELL" | "HOLD",
          confidence,
          upcomingEvents,
          weeklyEvents,
        },
        aiProvider
      );

      // Check if economic context already exists
      const existingContext = await getEconomicContextByAnalysisId(analysisId);

      if (existingContext) {
        logger.debug("Economic context already exists", { analysisId });
        return existingContext;
      }

      // Create new economic context
      const economicContext = await createEconomicContext({
        analysisId,
        symbol,
        upcomingEvents: upcomingEvents.map((e) => ({
          ...e,
          date: e.date.toISOString(),
        })),
        weeklyEvents: weeklyEvents.map((e) => ({
          ...e,
          date: e.date.toISOString(),
        })),
        immediateRisk: economicImpact.immediateRisk,
        weeklyOutlook: economicImpact.weeklyOutlook,
        impactSummary: economicImpact.impactSummary,
        warnings: economicImpact.warnings,
        opportunities: economicImpact.opportunities,
        recommendation: economicImpact.recommendation,
      });

      logger.info("Created economic context", {
        analysisId,
        symbol,
        immediateRisk: economicImpact.immediateRisk,
      });

      return economicContext;
    } else {
      logger.debug("No economic events found", { symbol });
      return null;
    }
  } catch (error) {
    logger.error("Error enriching with economic context", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      symbol,
      analysisId,
    });
    // Don't throw - economic context is optional
    return null;
  }
}

/**
 * Create or update analysis record
 * Checks if analysis exists for snapshot and creates/updates accordingly
 */
export async function createOrUpdateAnalysis(params: {
  userId: string;
  snapshotId: string;
  analysisData: {
    action: string;
    confidence: number;
    timeframe?: string;
    reasons: string[];
    tradeSetup?: any;
    isMultiLayout?: boolean;
    multiLayoutData?: any;
    aiModel: string;
    aiModelName: string;
    isAutomated: boolean;
  };
}): Promise<any> {
  const { userId, snapshotId, analysisData } = params;

  // Ensure timeframe has a default value
  const dataWithDefaults = {
    ...analysisData,
    timeframe: analysisData.timeframe || "Unknown",
  };

  // Check if analysis already exists
  const existingAnalysis = await getAnalysisBySnapshotId(snapshotId);

  if (existingAnalysis) {
    logger.debug("Updating existing analysis", {
      analysisId: existingAnalysis.id,
      snapshotId,
    });
    return await updateAnalysis(existingAnalysis.id, dataWithDefaults);
  } else {
    logger.debug("Creating new analysis", { snapshotId, userId });
    return await createAnalysis(userId, snapshotId, dataWithDefaults);
  }
}

/**
 * Execute single chart analysis
 * Performs AI analysis and creates/updates analysis record
 */
export async function executeSingleChartAnalysis(params: {
  userId: string;
  snapshotId: string;
  imageUrl: string;
  aiModel?: string;
  isAutomated?: boolean;
}): Promise<{ analysis: any; analysisResult: AnalysisResult }> {
  const {
    userId,
    snapshotId,
    imageUrl,
    aiModel,
    isAutomated = false,
  } = params;

  // Parse AI model
  const modelConfig = parseAIModel(aiModel);

  logger.info("Analyzing chart with AI", {
    snapshotId,
    aiModel: modelConfig.modelName,
    provider: modelConfig.provider,
  });

  // Analyze chart
  const analysisResult = await aiService.analyzeChart(
    imageUrl,
    modelConfig.provider,
    modelConfig.modelId
  );

  // Create or update analysis
  let analysis = await createOrUpdateAnalysis({
    userId,
    snapshotId,
    analysisData: {
      action: analysisResult.action,
      confidence: analysisResult.confidence,
      timeframe: analysisResult.timeframe,
      reasons: analysisResult.reasons,
      tradeSetup: analysisResult.tradeSetup,
      aiModel: aiModel || `${modelConfig.provider}:${modelConfig.modelId}`,
      aiModelName: modelConfig.modelName,
      isAutomated,
    },
  });

  // Fetch the full analysis with snapshot relations for Telegram/other services
  analysis = await prisma.analysis.findUnique({
    where: { id: analysis.id },
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
    },
  });

  logger.info("Analysis created/updated", {
    analysisId: analysis.id,
    action: analysis.action,
    confidence: analysis.confidence,
  });

  return { analysis, analysisResult };
}

/**
 * Execute multi-layout chart analysis
 * Analyzes multiple timeframes and creates/updates analysis record
 */
export async function executeMultiLayoutAnalysis(params: {
  userId: string;
  layouts: Array<{
    layoutId: string;
    interval: string;
    imageUrl: string;
    snapshotId: string;
  }>;
  aiModel?: string;
  isAutomated?: boolean;
}): Promise<{ analysis: any; analysisResult: AnalysisResult }> {
  const { userId, layouts, aiModel, isAutomated = false } = params;

  // Parse AI model
  const modelConfig = parseAIModel(aiModel);

  logger.info("Analyzing multiple layouts with AI", {
    layoutCount: layouts.length,
    aiModel: modelConfig.modelName,
    provider: modelConfig.provider,
  });

  // Analyze multiple layouts
  const analysisResult = await aiService.analyzeMultipleLayouts(
    layouts,
    modelConfig.provider,
    modelConfig.modelId
  );

  // Use the first snapshot as primary
  const primarySnapshotId = layouts[0].snapshotId;

  // Prepare multi-layout data
  const multiLayoutData = {
    layoutsAnalyzed: layouts.length,
    intervals: layouts.map((l) => l.interval),
    multiLayoutSnapshots: layouts.map((l) => ({
      interval: l.interval,
      layoutId: l.layoutId,
      snapshotId: l.snapshotId,
      imageUrl: l.imageUrl,
    })),
  };

  // Create or update analysis
  let analysis = await createOrUpdateAnalysis({
    userId,
    snapshotId: primarySnapshotId,
    analysisData: {
      action: analysisResult.action,
      confidence: analysisResult.confidence,
      timeframe: analysisResult.timeframe,
      reasons: analysisResult.reasons,
      tradeSetup: analysisResult.tradeSetup,
      isMultiLayout: true,
      multiLayoutData,
      aiModel: aiModel || `${modelConfig.provider}:${modelConfig.modelId}`,
      aiModelName: modelConfig.modelName,
      isAutomated,
    },
  });

  // Fetch the full analysis with snapshot relations for Telegram/other services
  analysis = await prisma.analysis.findUnique({
    where: { id: analysis.id },
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
    },
  });

  logger.info("Multi-layout analysis created/updated", {
    analysisId: analysis.id,
    action: analysis.action,
    confidence: analysis.confidence,
    layoutCount: layouts.length,
  });

  return { analysis, analysisResult };
}

/**
 * Execute complete analysis with economic context
 * Combines chart analysis and economic enrichment
 */
export async function executeCompleteAnalysis(params: {
  userId: string;
  snapshotId: string;
  imageUrl: string;
  symbol?: string;
  aiModel?: string;
  isAutomated?: boolean;
}): Promise<{ analysis: any; economicContext: any | null }> {
  const { userId, snapshotId, imageUrl, symbol, aiModel, isAutomated } = params;

  // Execute chart analysis
  const { analysis, analysisResult } = await executeSingleChartAnalysis({
    userId,
    snapshotId,
    imageUrl,
    aiModel,
    isAutomated,
  });

  // Enrich with economic context if symbol is available
  let economicContext = null;
  if (symbol) {
    const modelConfig = parseAIModel(aiModel);
    economicContext = await enrichWithEconomicContext({
      symbol,
      analysisId: analysis.id,
      action: analysisResult.action,
      confidence: analysisResult.confidence,
      aiProvider: modelConfig.provider,
    });
  }

  return { analysis, economicContext };
}

/**
 * Execute complete multi-layout analysis with economic context
 * Combines multi-layout analysis and economic enrichment
 */
export async function executeCompleteMultiLayoutAnalysis(params: {
  userId: string;
  layouts: Array<{
    layoutId: string;
    interval: string;
    imageUrl: string;
    snapshotId: string;
  }>;
  symbol: string;
  aiModel?: string;
  isAutomated?: boolean;
}): Promise<{ analysis: any; economicContext: any | null }> {
  const { userId, layouts, symbol, aiModel, isAutomated } = params;

  // Execute multi-layout analysis
  const { analysis, analysisResult } = await executeMultiLayoutAnalysis({
    userId,
    layouts,
    aiModel,
    isAutomated,
  });

  // Enrich with economic context
  const modelConfig = parseAIModel(aiModel);
  const economicContext = await enrichWithEconomicContext({
    symbol,
    analysisId: analysis.id,
    action: analysisResult.action,
    confidence: analysisResult.confidence,
    aiProvider: modelConfig.provider,
  });

  return { analysis, economicContext };
}
