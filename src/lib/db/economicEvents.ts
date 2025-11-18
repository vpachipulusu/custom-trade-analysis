/**
 * Database operations for EconomicEvent table
 */

import { prisma } from "@/lib/prisma";
import { EconomicEvent } from "@/lib/services/economicCalendar";
import { getLogger } from "../logging";

/**
 * Upsert economic events (batch operation)
 */
export async function upsertEconomicEvents(
  events: Partial<EconomicEvent>[]
): Promise<void> {
  const logger = getLogger();
  try {
    for (const event of events) {
      await prisma.economicEvent.upsert({
        where: { eventId: event.eventId! },
        update: {
          date: event.date,
          time: event.time,
          country: event.country!,
          currency: event.currency,
          event: event.event!,
          impact: event.impact!,
          category: event.category!,
          actual: event.actual,
          forecast: event.forecast,
          previous: event.previous,
          source: event.source!,
        },
        create: {
          eventId: event.eventId!,
          date: event.date!,
          time: event.time,
          country: event.country!,
          currency: event.currency,
          event: event.event!,
          impact: event.impact!,
          category: event.category!,
          actual: event.actual,
          forecast: event.forecast,
          previous: event.previous,
          source: event.source!,
        },
      });
    }

    logger.info("Upserted economic events", { count: events.length });
  } catch (error) {
    logger.error("Error upserting economic events", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      eventsCount: events.length
    });
    throw error;
  }
}

/**
 * Get events by date range with optional filters
 */
export async function getEventsByDateRange(
  startDate: Date,
  endDate: Date,
  filters?: {
    countries?: string[];
    currencies?: string[];
    minImpact?: "LOW" | "MEDIUM" | "HIGH";
  }
): Promise<any[]> {
  try {
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filters?.countries && filters.countries.length > 0) {
      where.country = { in: filters.countries };
    }

    if (filters?.currencies && filters.currencies.length > 0) {
      where.currency = { in: filters.currencies };
    }

    if (filters?.minImpact) {
      const impactLevels = ["LOW", "MEDIUM", "HIGH"];
      const minIndex = impactLevels.indexOf(filters.minImpact);
      where.impact = { in: impactLevels.slice(minIndex) };
    }

    const events = await prisma.economicEvent.findMany({
      where,
      orderBy: [{ date: "asc" }, { impact: "desc" }],
    });

    return events;
  } catch (error) {
    const logger = getLogger();
    logger.error("Error fetching events by date range", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      startDate,
      endDate
    });
    return [];
  }
}

/**
 * Get events relevant to a specific symbol
 */
export async function getEventsForSymbol(
  symbol: string,
  date: Date,
  windowDays: number = 7
): Promise<any[]> {
  try {
    const { parseSymbolCurrencies } = await import(
      "@/lib/services/economicCalendar"
    );
    const { currencies, countries } = parseSymbolCurrencies(symbol);

    const startDate = date;
    const endDate = new Date(date.getTime() + windowDays * 24 * 60 * 60 * 1000);

    return getEventsByDateRange(startDate, endDate, {
      countries: countries.length > 0 ? countries : undefined,
      currencies: currencies.length > 0 ? currencies : undefined,
    });
  } catch (error) {
    const logger = getLogger();
    logger.error("Error fetching events for symbol", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      symbol,
      date
    });
    return [];
  }
}

/**
 * Delete old events (cleanup)
 */
export async function deleteOldEvents(daysOld: number = 30): Promise<number> {
  const logger = getLogger();
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.economicEvent.deleteMany({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    });

    logger.info("Deleted old economic events", {
      count: result.count,
      daysOld,
      cutoffDate: cutoffDate.toISOString()
    });
    return result.count;
  } catch (error) {
    logger.error("Error deleting old events", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      daysOld
    });
    return 0;
  }
}
