import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createAnalysis, updateAnalysis } from "@/lib/db/analyses";
import { analyzeMultiTimeframeCharts, analyzeEconomicImpact } from "@/lib/services/openai";
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
import prisma from "@/lib/prisma";

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
    const chartsData = layoutsWithSnapshots.map(layout => ({
      interval: layout.interval || 'Unknown',
      imageUrl: layout.snapshots[0].url, // Latest snapshot
      layoutId: layout.id,
      snapshotId: layout.snapshots[0].id,
    }));

    // Analyze charts using OpenAI with performance tracking
    const analysisResult = await performanceLogger.measure(
      'openai_multitimeframe_analysis',
      async () => {
        const startTime = Date.now();
        const result = await analyzeMultiTimeframeCharts(
          chartsData.map(c => ({ interval: c.interval, imageUrl: c.imageUrl }))
        );
        const duration = Date.now() - startTime;

        logExternalAPI('OpenAI', '/v1/chat/completions', 'POST', 200, duration);

        return result;
      },
      { symbol, timeframeCount: chartsData.length }
    );

    // Use the primary (first) snapshot for linking the analysis
    const primarySnapshotId = chartsData[0].snapshotId;

    // Check if analysis already exists for this snapshot
    const existingAnalysis = await prisma.analysis.findUnique({
      where: { snapshotId: primarySnapshotId },
    });

    let analysis;
    if (existingAnalysis) {
      // Update existing analysis
      analysis = await updateAnalysis(existingAnalysis.id, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
        tradeSetup: analysisResult.tradeSetup,
      });
    } else {
      // Create new analysis
      analysis = await createAnalysis(authResult.user.userId, primarySnapshotId, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
        tradeSetup: analysisResult.tradeSetup,
      });
    }

    // Fetch and analyze economic context
    let economicContext = null;
    try {
      logger.info('Fetching economic context', { symbol, analysisId: analysis.id });

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
        logger.info('Found economic events', {
          symbol,
          upcomingCount: upcomingEvents.length,
          weeklyCount: weeklyEvents.length
        });

        // Get AI analysis of economic impact
        const economicImpact = await analyzeEconomicImpact({
          symbol,
          action: analysisResult.action,
          confidence: analysisResult.confidence,
          upcomingEvents,
          weeklyEvents,
        });

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

          logger.info('Created economic context', {
            analysisId: analysis.id,
            symbol,
            immediateRisk: economicImpact.immediateRisk
          });
        }
      } else {
        logger.debug('No economic events found', { symbol });
      }
    } catch (economicError) {
      // Log error but don't fail the analysis
      logger.error('Error fetching economic context', {
        error: economicError instanceof Error ? economicError.message : 'Unknown error',
        stack: economicError instanceof Error ? economicError.stack : undefined
      });
    }

    logger.info('Multi-timeframe analysis completed successfully', {
      symbol,
      timeframeCount: chartsData.length,
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
          timeframes: chartsData.map(c => c.interval),
          layoutCount: chartsData.length,
        },
      },
      {
        status: existingAnalysis ? 200 : 201,
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
