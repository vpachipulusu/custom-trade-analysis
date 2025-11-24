import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";
import { performanceLogger } from "@/lib/logging/middleware/performanceLogger";
import { logExternalAPI, logUserAction } from "@/lib/logging/helpers";
import { getLayoutsBySymbol } from "@/lib/db/layouts";
import {
  executeCompleteMultiLayoutAnalysis,
  parseAIModel,
} from "@/lib/services/analysisService";

/**
 * POST /api/analyze-symbol
 * Analyze all layouts for a specific symbol using multi-timeframe analysis
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
      userEmail: authResult.user.email
    });

    logger.info('Multi-timeframe analysis request started', { userId: authResult.user.userId });

    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      logger.warn('Multi-timeframe analysis request missing symbol', { userId: authResult.user.userId });
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 }
      );
    }

    // Log user action
    logUserAction(authResult.user.userId, 'analyze_symbol_multitimeframe', { symbol });

    // Get all layouts for this symbol
    const layouts = await getLayoutsBySymbol(authResult.user.userId, symbol);

    if (!layouts || layouts.length === 0) {
      logger.warn('No layouts found for symbol', { symbol, userId: authResult.user.userId });
      return NextResponse.json(
        { error: `No layouts found for symbol: ${symbol}` },
        { status: 404 }
      );
    }

    // Filter layouts that have snapshots
    const layoutsWithSnapshots = layouts.filter(
      layout => layout.snapshots && layout.snapshots.length > 0
    );

    if (layoutsWithSnapshots.length === 0) {
      logger.warn('No snapshots found for symbol layouts', { symbol, userId: authResult.user.userId });
      return NextResponse.json(
        { error: `No snapshots available for symbol: ${symbol}. Please create snapshots first.` },
        { status: 404 }
      );
    }

    logger.info('Found layouts with snapshots', {
      symbol,
      layoutCount: layoutsWithSnapshots.length,
      timeframes: layoutsWithSnapshots.map(l => l.interval || 'Unknown')
    });

    // Prepare chart data for multi-timeframe analysis
    const layoutsData = layoutsWithSnapshots.map(layout => ({
      interval: layout.interval || 'Unknown',
      imageUrl: layout.snapshots[0].url, // Latest snapshot
      layoutId: layout.id,
      snapshotId: layout.snapshots[0].id,
    }));

    // Parse AI model
    const modelConfig = parseAIModel();

    // Use shared service for multi-layout analysis with performance tracking
    const { analysis, economicContext } = await performanceLogger.measure(
      'openai_multitimeframe_analysis',
      async () => {
        const startTime = Date.now();
        const result = await executeCompleteMultiLayoutAnalysis({
          userId: authResult.user.userId,
          layouts: layoutsData,
          symbol,
          isAutomated: false,
        });
        const duration = Date.now() - startTime;

        logExternalAPI(modelConfig.provider.toUpperCase(), '/v1/chat/completions', 'POST', 200, duration);

        return result;
      },
      { symbol, timeframeCount: layoutsData.length }
    );

    logger.info('Multi-timeframe analysis completed successfully', {
      symbol,
      timeframeCount: layoutsData.length,
      action: analysis.action,
      confidence: analysis.confidence,
      hasEconomicContext: !!economicContext
    });

    // Return analysis with additional multi-timeframe info
    return NextResponse.json(
      {
        ...analysis,
        economicContext,
        multiTimeframe: {
          symbol,
          timeframes: layoutsData.map(c => c.interval),
          layoutCount: layoutsData.length,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    logger.error('Multi-timeframe analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
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
