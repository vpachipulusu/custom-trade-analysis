import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import {
  fetchEconomicEvents,
  filterEventsByTimeframe,
  parseSymbolCurrencies,
} from "@/lib/services/economicCalendar";
import { analyzeEconomicImpact } from "@/lib/services/openai";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * POST /api/economic-impact
 * Analyze economic impact for a symbol
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { symbol, action, date } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 }
      );
    }

    // Default date to now
    const referenceDate = date ? new Date(date) : new Date();

    // Parse symbol to get currencies/countries
    const { currencies, countries } = parseSymbolCurrencies(symbol);

    // Fetch events: ±1 hour window and 7 days ahead
    const oneHourBefore = new Date(referenceDate.getTime() - 60 * 60 * 1000);
    const sevenDaysAhead = new Date(
      referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const allEvents = await fetchEconomicEvents({
      startDate: oneHourBefore,
      endDate: sevenDaysAhead,
      countries: countries.length > 0 ? countries : undefined,
      currencies: currencies.length > 0 ? currencies : undefined,
    });

    // Filter into upcomingEvents (±1 hour) and weeklyEvents (7 days)
    const { upcomingEvents, weeklyEvents } = filterEventsByTimeframe(
      allEvents,
      referenceDate
    );

    // If action provided, call AI analysis
    if (action) {
      const aiAnalysis = await analyzeEconomicImpact({
        symbol,
        action: action as "BUY" | "SELL" | "HOLD",
        confidence: 0, // Default confidence if not provided
        upcomingEvents,
        weeklyEvents,
      });

      return NextResponse.json({
        symbol,
        action,
        date: referenceDate,
        upcomingEvents,
        weeklyEvents,
        ...aiAnalysis,
      });
    }

    // Return just the events without AI analysis
    return NextResponse.json({
      symbol,
      date: referenceDate,
      upcomingEvents,
      weeklyEvents,
    });
  } catch (error) {
    console.error("[API] Error in /api/economic-impact:", error);
    return createErrorResponse(error, 500);
  }
}
