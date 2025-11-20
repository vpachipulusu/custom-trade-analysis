import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getSnapshotById } from "@/lib/db/snapshots";
import {
  createAnalysis,
  getAnalysisBySnapshotId,
  updateAnalysis,
} from "@/lib/db/analyses";
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
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";
import { performanceLogger } from "@/lib/logging/middleware/performanceLogger";
import { logExternalAPI, logUserAction } from "@/lib/logging/helpers";
import { getLayoutsBySymbol } from "@/lib/db/layouts";
import { createSnapshot } from "@/lib/db/snapshots";

/**
 * POST /api/analyze
 * Analyze a snapshot using AI, or analyze all layouts for a symbol
 */
export async function POST(request: NextRequest) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for all logs in this request
    LogContext.set({
      userId: authResult.user.userId,
      userEmail: authResult.user.email,
    });

    logger.info("Analysis request started", { userId: authResult.user.userId });

    const body = await request.json();
    const { snapshotId, symbol, aiModel } = body;

    // Parse AI model selection (format: "provider:modelId" or just "modelId")
    let selectedProvider: "openai" | "gemini" | "claude" = "openai";
    let selectedModelId: string;
    let modelName: string;

    if (aiModel && aiModel.includes(":")) {
      const [provider, modelId] = aiModel.split(":");
      selectedProvider = provider as any;
      selectedModelId = modelId;
      modelName = `${provider.toUpperCase()} ${modelId}`;
    } else {
      // Fallback to default if no model specified
      selectedProvider = "openai";
      selectedModelId = "gpt-4o";
      modelName = "OpenAI GPT-4o";
    }

    // Two modes: single snapshot analysis OR symbol-based multi-layout analysis
    if (!snapshotId && !symbol) {
      logger.warn("Analysis request missing both snapshotId and symbol", {
        userId: authResult.user.userId,
      });
      return NextResponse.json(
        { error: "Either snapshotId or symbol is required" },
        { status: 400 }
      );
    }

    // Mode 1: Analyze multiple layouts for a symbol
    if (symbol) {
      try {
        logger.info("Symbol-based multi-layout analysis requested", {
          symbol,
          userId: authResult.user.userId,
        });

        logUserAction(authResult.user.userId, "analyze_symbol", { symbol });

        // Get all layouts for this symbol
        const layouts = await getLayoutsBySymbol(
          authResult.user.userId,
          symbol
        );

        if (!layouts || layouts.length === 0) {
          logger.warn("No layouts found for symbol", {
            symbol,
            userId: authResult.user.userId,
          });
          return NextResponse.json(
            { error: `No layouts found for symbol ${symbol}` },
            { status: 404 }
          );
        }

        logger.info("Found layouts for symbol", {
          symbol,
          layoutCount: layouts.length,
          intervals: layouts.map((l) => l.interval).join(", "),
        });

        // Get the latest snapshot for each layout
        // Cast to any to work around Prisma type limitations
        logger.debug("Processing layouts for snapshots", {
          symbol,
          layoutsCount: layouts.length,
        });

        const layoutsWithSnapshots = (layouts as any[])
          .filter((layout) => layout.snapshots && layout.snapshots.length > 0)
          .map((layout) => ({
            layoutId: layout.id,
            interval: layout.interval || "Unknown",
            imageUrl: layout.snapshots[0].url,
            snapshotId: layout.snapshots[0].id,
          }));

        logger.debug("Filtered layouts with snapshots", {
          symbol,
          layoutsWithSnapshotsCount: layoutsWithSnapshots.length,
          snapshots: layoutsWithSnapshots.map((l) => ({
            interval: l.interval,
            hasImageUrl: !!l.imageUrl,
          })),
        });

        if (layoutsWithSnapshots.length === 0) {
          logger.warn("No snapshots found for any layout of symbol", {
            symbol,
            userId: authResult.user.userId,
          });
          return NextResponse.json(
            {
              error: `No snapshots found for layouts of ${symbol}. Please generate snapshots first.`,
            },
            { status: 404 }
          );
        }

        logger.info("Analyzing multiple layouts", {
          symbol,
          layoutCount: layoutsWithSnapshots.length,
          intervals: layoutsWithSnapshots.map((l) => l.interval).join(", "),
        });

        // Analyze multiple layouts with selected AI model
        const analysisResult = await performanceLogger.measure(
          "ai_multi_layout_analysis",
          async () => {
            const startTime = Date.now();
            const result = await aiService.analyzeMultipleLayouts(
              layoutsWithSnapshots,
              selectedProvider,
              selectedModelId
            );
            const duration = Date.now() - startTime;

            logExternalAPI(
              selectedProvider.toUpperCase(),
              "/multi-layout-analysis",
              "POST",
              200,
              duration
            );

            return result;
          },
          { symbol, layoutCount: layoutsWithSnapshots.length, aiModel: modelName }
        );

        // Use the most recent snapshot for storing the analysis
        const primarySnapshotId = layoutsWithSnapshots[0].snapshotId;

        // Check if analysis already exists for this snapshot
        const existingAnalysis = await getAnalysisBySnapshotId(
          primarySnapshotId
        );

        // Prepare multi-layout data to save
        const multiLayoutData = {
          layoutsAnalyzed: layoutsWithSnapshots.length,
          intervals: layoutsWithSnapshots.map((l) => l.interval),
          multiLayoutSnapshots: layoutsWithSnapshots.map((l) => ({
            interval: l.interval,
            layoutId: l.layoutId,
            snapshotId: l.snapshotId,
            imageUrl: l.imageUrl,
          })),
        };

        let analysis;
        if (existingAnalysis) {
          analysis = await updateAnalysis(existingAnalysis.id, {
            action: analysisResult.action,
            confidence: analysisResult.confidence,
            timeframe: analysisResult.timeframe,
            reasons: analysisResult.reasons,
            tradeSetup: analysisResult.tradeSetup,
            isMultiLayout: true,
            multiLayoutData,
            aiModel: aiModel || `${selectedProvider}:${selectedModelId}`,
            aiModelName: modelName,
          });
        } else {
          analysis = await createAnalysis(
            authResult.user.userId,
            primarySnapshotId,
            {
              action: analysisResult.action,
              confidence: analysisResult.confidence,
              timeframe: analysisResult.timeframe,
              reasons: analysisResult.reasons,
              tradeSetup: analysisResult.tradeSetup,
              isMultiLayout: true,
              multiLayoutData,
              aiModel: aiModel || `${selectedProvider}:${selectedModelId}`,
              aiModelName: modelName,
            }
          );
        }

        // Fetch and analyze economic context
        let economicContext = null;
        try {
          logger.info("Fetching economic context", {
            symbol,
            analysisId: analysis.id,
          });

          const { currencies, countries } = parseSymbolCurrencies(symbol);

          const now = new Date();
          const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
          const sevenDaysAhead = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
          );

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

          if (upcomingEvents.length > 0 || weeklyEvents.length > 0) {
            const economicImpact = await aiService.analyzeEconomicImpact({
              symbol,
              action: analysisResult.action,
              confidence: analysisResult.confidence,
              upcomingEvents,
              weeklyEvents,
            }, selectedProvider);

            const existingContext = await getEconomicContextByAnalysisId(
              analysis.id
            );

            if (!existingContext) {
              economicContext = await createEconomicContext({
                analysisId: analysis.id,
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
            }
          }
        } catch (economicError) {
          logger.error("Error fetching economic context", {
            error:
              economicError instanceof Error
                ? economicError.message
                : "Unknown error",
          });
        }

        logger.info("Multi-layout analysis completed", {
          symbol,
          layoutCount: layoutsWithSnapshots.length,
          action: analysis.action,
          confidence: analysis.confidence,
        });

        return NextResponse.json(
          {
            ...analysis,
            economicContext,
          },
          { status: existingAnalysis ? 200 : 201 }
        );
      } catch (symbolAnalysisError) {
        logger.error("Symbol-based analysis failed", {
          error:
            symbolAnalysisError instanceof Error
              ? symbolAnalysisError.message
              : "Unknown error",
          stack:
            symbolAnalysisError instanceof Error
              ? symbolAnalysisError.stack
              : undefined,
          symbol,
        });
        return createErrorResponse(symbolAnalysisError, 500);
      }
    }

    // Mode 2: Single snapshot analysis (original behavior)
    if (!snapshotId) {
      logger.warn("Analysis request missing snapshotId", {
        userId: authResult.user.userId,
      });
      return NextResponse.json(
        { error: "snapshotId is required" },
        { status: 400 }
      );
    }

    // Log user action
    logUserAction(authResult.user.userId, "analyze_chart", { snapshotId });

    // Get snapshot and verify ownership
    const snapshot = await getSnapshotById(snapshotId);
    if (!snapshot) {
      logger.warn("Snapshot not found", {
        snapshotId,
        userId: authResult.user.userId,
      });
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    // Cast to any to work around Prisma type limitations
    const snapshotWithLayout = snapshot as any;

    if (
      !snapshotWithLayout.layout?.user ||
      !verifyOwnership(
        authResult.user.userId,
        snapshotWithLayout.layout.user.id
      )
    ) {
      logger.warn("Unauthorized snapshot access attempt", {
        snapshotId,
        userId: authResult.user.userId,
        ownerId: snapshotWithLayout.layout?.user?.id,
      });
      return NextResponse.json(
        { error: "You do not have permission to analyze this snapshot" },
        { status: 403 }
      );
    }

    // Check if analysis already exists
    const existingAnalysis = await getAnalysisBySnapshotId(snapshotId);

    // Analyze chart using selected AI model with performance tracking
    const analysisResult = await performanceLogger.measure(
      "ai_chart_analysis",
      async () => {
        const startTime = Date.now();
        const result = await aiService.analyzeChart(
          snapshot.url,
          selectedProvider,
          selectedModelId
        );
        const duration = Date.now() - startTime;

        logExternalAPI(
          selectedProvider.toUpperCase(),
          "/chart-analysis",
          "POST",
          200,
          duration
        );

        return result;
      },
      { snapshotId, aiModel: modelName }
    );

    let analysis;
    if (existingAnalysis) {
      // Update existing analysis
      analysis = await updateAnalysis(existingAnalysis.id, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
        tradeSetup: analysisResult.tradeSetup,
        aiModel: aiModel || `${selectedProvider}:${selectedModelId}`,
        aiModelName: modelName,
      });
    } else {
      // Create new analysis
      analysis = await createAnalysis(authResult.user.userId, snapshotId, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
        tradeSetup: analysisResult.tradeSetup,
        aiModel: aiModel || `${selectedProvider}:${selectedModelId}`,
        aiModelName: modelName,
      });
    }

    // Fetch and analyze economic context if symbol is available
    let economicContext = null;
    try {
      const symbol = snapshotWithLayout.layout?.symbol;

      if (symbol) {
        logger.info("Fetching economic context", {
          symbol,
          analysisId: analysis.id,
        });

        // Parse symbol to get currencies/countries
        const { currencies, countries } = parseSymbolCurrencies(symbol);

        // Fetch events: ±1 hour window and 7 days ahead
        const now = new Date();
        const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
        const sevenDaysAhead = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        );

        const allEvents = await fetchEconomicEvents({
          startDate: oneHourBefore,
          endDate: sevenDaysAhead,
          countries: countries.length > 0 ? countries : undefined,
          currencies: currencies.length > 0 ? currencies : undefined,
        });

        // Filter into upcomingEvents and weeklyEvents
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

          // Get AI analysis of economic impact using selected model
          const economicImpact = await aiService.analyzeEconomicImpact({
            symbol,
            action: analysisResult.action,
            confidence: analysisResult.confidence,
            upcomingEvents,
            weeklyEvents,
          }, selectedProvider);

          // Check if economic context already exists
          const existingContext = await getEconomicContextByAnalysisId(
            analysis.id
          );

          if (!existingContext) {
            // Create new economic context
            economicContext = await createEconomicContext({
              analysisId: analysis.id,
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
              analysisId: analysis.id,
              symbol,
              immediateRisk: economicImpact.immediateRisk,
            });
          }
        } else {
          logger.debug("No economic events found", { symbol });
        }
      }
    } catch (economicError) {
      // Log error but don't fail the analysis
      logger.error("Error fetching economic context", {
        error:
          economicError instanceof Error
            ? economicError.message
            : "Unknown error",
        stack: economicError instanceof Error ? economicError.stack : undefined,
      });
    }

    logger.info("Analysis completed successfully", {
      snapshotId,
      action: analysis.action,
      confidence: analysis.confidence,
      hasEconomicContext: !!economicContext,
    });

    // Return analysis with economic context
    return NextResponse.json(
      {
        ...analysis,
        economicContext,
      },
      {
        status: existingAnalysis ? 200 : 201,
      }
    );
  } catch (error) {
    logger.error("Analysis failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific OpenAI errors
    if (error instanceof Error && error.message.includes("OpenAI")) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 } // Bad Gateway
      );
    }

    return createErrorResponse(error, 500);
  }
}
