import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getSnapshotById } from "@/lib/db/snapshots";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";
import { performanceLogger } from "@/lib/logging/middleware/performanceLogger";
import { logExternalAPI, logUserAction } from "@/lib/logging/helpers";
import { getLayoutsBySymbol } from "@/lib/db/layouts";
import {
  executeCompleteAnalysis,
  executeCompleteMultiLayoutAnalysis,
  parseAIModel,
} from "@/lib/services/analysisService";

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
    const { snapshotId, symbol, aiModel, isAutomated = false } = body;

    // Parse AI model selection using shared service
    const modelConfig = parseAIModel(aiModel);

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

        // Use shared service for multi-layout analysis
        const { analysis, economicContext } = await performanceLogger.measure(
          "ai_multi_layout_analysis",
          async () => {
            const startTime = Date.now();
            const result = await executeCompleteMultiLayoutAnalysis({
              userId: authResult.user.userId,
              layouts: layoutsWithSnapshots,
              symbol,
              aiModel,
              isAutomated,
            });
            const duration = Date.now() - startTime;

            logExternalAPI(
              modelConfig.provider.toUpperCase(),
              "/multi-layout-analysis",
              "POST",
              200,
              duration
            );

            return result;
          },
          { symbol, layoutCount: layoutsWithSnapshots.length, aiModel: modelConfig.modelName }
        );

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
          { status: 201 }
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

    // Use shared service for single chart analysis with performance tracking
    const { analysis, economicContext } = await performanceLogger.measure(
      "ai_chart_analysis",
      async () => {
        const startTime = Date.now();
        const result = await executeCompleteAnalysis({
          userId: authResult.user.userId,
          snapshotId,
          imageUrl: snapshot.url,
          symbol: snapshotWithLayout.layout?.symbol,
          aiModel,
          isAutomated,
        });
        const duration = Date.now() - startTime;

        logExternalAPI(
          modelConfig.provider.toUpperCase(),
          "/chart-analysis",
          "POST",
          200,
          duration
        );

        return result;
      },
      { snapshotId, aiModel: modelConfig.modelName }
    );

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
        status: 201,
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
