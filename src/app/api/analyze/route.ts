import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getSnapshotById } from "@/lib/db/snapshots";
import {
  createAnalysis,
  getAnalysisBySnapshotId,
  updateAnalysis,
} from "@/lib/db/analyses";
import { analyzeChart, analyzeEconomicImpact } from "@/lib/services/openai";
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

/**
 * POST /api/analyze
 * Analyze a snapshot using AI
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

    logger.info('Analysis request started', { userId: authResult.user.userId });

    const body = await request.json();
    const { snapshotId } = body;

    if (!snapshotId) {
      logger.warn('Analysis request missing snapshotId', { userId: authResult.user.userId });
      return NextResponse.json(
        { error: "snapshotId is required" },
        { status: 400 }
      );
    }

    // Log user action
    logUserAction(authResult.user.userId, 'analyze_chart', { snapshotId });

    // Get snapshot and verify ownership
    const snapshot = await getSnapshotById(snapshotId);
    if (!snapshot) {
      logger.warn('Snapshot not found', { snapshotId, userId: authResult.user.userId });
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    if (
      !snapshot.layout?.user ||
      !verifyOwnership(authResult.user.userId, snapshot.layout.user.id)
    ) {
      logger.warn('Unauthorized snapshot access attempt', {
        snapshotId,
        userId: authResult.user.userId,
        ownerId: snapshot.layout?.user?.id
      });
      return NextResponse.json(
        { error: "You do not have permission to analyze this snapshot" },
        { status: 403 }
      );
    }

    // Check if analysis already exists
    const existingAnalysis = await getAnalysisBySnapshotId(snapshotId);

    // Analyze chart using OpenAI with performance tracking
    const analysisResult = await performanceLogger.measure(
      'openai_chart_analysis',
      async () => {
        const startTime = Date.now();
        const result = await analyzeChart(snapshot.url);
        const duration = Date.now() - startTime;

        logExternalAPI('OpenAI', '/v1/chat/completions', 'POST', 200, duration);

        return result;
      },
      { snapshotId }
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
      });
    } else {
      // Create new analysis
      analysis = await createAnalysis(authResult.user.userId, snapshotId, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
        tradeSetup: analysisResult.tradeSetup,
      });
    }

    // Fetch and analyze economic context if symbol is available
    let economicContext = null;
    try {
      const symbol = snapshot.layout?.symbol;

      if (symbol) {
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
      }
    } catch (economicError) {
      // Log error but don't fail the analysis
      logger.error('Error fetching economic context', {
        error: economicError instanceof Error ? economicError.message : 'Unknown error',
        stack: economicError instanceof Error ? economicError.stack : undefined
      });
    }

    logger.info('Analysis completed successfully', {
      snapshotId,
      action: analysis.action,
      confidence: analysis.confidence,
      hasEconomicContext: !!economicContext
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
    logger.error('Analysis failed', {
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
