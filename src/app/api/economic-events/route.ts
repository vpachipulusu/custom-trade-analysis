import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import {
  fetchEconomicEvents,
  parseSymbolCurrencies,
} from "@/lib/services/economicCalendar";
import { upsertEconomicEvents } from "@/lib/db/economicEvents";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * GET /api/economic-events
 * Fetch economic events with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const countriesParam = searchParams.get("countries");
    const impactParam = searchParams.get("impact");

    // Default dates: now to 7 days from now
    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Parse symbol if provided
    let countries: string[] | undefined;
    let currencies: string[] | undefined;

    if (symbol) {
      const symbolInfo = parseSymbolCurrencies(symbol);
      countries =
        symbolInfo.countries.length > 0 ? symbolInfo.countries : undefined;
      currencies =
        symbolInfo.currencies.length > 0 ? symbolInfo.currencies : undefined;
    }

    // Parse countries from query param
    if (countriesParam) {
      countries = countriesParam.split(",").map((c) => c.trim());
    }

    // Fetch events
    let events = await fetchEconomicEvents({
      startDate,
      endDate,
      countries,
      currencies,
    });

    // Filter by impact level if specified
    if (impactParam) {
      const impactLevels = ["LOW", "MEDIUM", "HIGH"];
      const minIndex = impactLevels.indexOf(impactParam.toUpperCase());
      if (minIndex >= 0) {
        const allowedImpacts = impactLevels.slice(minIndex);
        events = events.filter((event) =>
          allowedImpacts.includes(event.impact)
        );
      }
    }

    // Store events in database (background task - don't await)
    if (events.length > 0) {
      upsertEconomicEvents(events).catch((error) => {
        console.error("[API] Error storing events in database:", error);
      });
    }

    // Set cache headers (1 hour)
    return NextResponse.json(events, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("[API] Error in /api/economic-events:", error);
    return createErrorResponse(error, 500);
  }
}
