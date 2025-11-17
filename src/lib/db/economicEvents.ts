/**
 * Database operations for EconomicEvent table
 */

import { prisma } from "@/lib/prisma";
import { EconomicEvent } from "@/lib/services/economicCalendar";

/**
 * Upsert economic events (batch operation)
 */
export async function upsertEconomicEvents(
  events: Partial<EconomicEvent>[]
): Promise<void> {
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

    console.log(`[DB] Upserted ${events.length} economic events to database`);
  } catch (error) {
    console.error("[DB] Error upserting economic events:", error);
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
    console.error("[DB] Error fetching events by date range:", error);
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
    console.error("[DB] Error fetching events for symbol:", error);
    return [];
  }
}

/**
 * Delete old events (cleanup)
 */
export async function deleteOldEvents(daysOld: number = 30): Promise<number> {
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

    console.log(`[DB] Deleted ${result.count} old economic events`);
    return result.count;
  } catch (error) {
    console.error("[DB] Error deleting old events:", error);
    return 0;
  }
}
