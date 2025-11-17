/**
 * Economic Calendar Service using Financial Modeling Prep (FMP) API
 * Free tier: 250 requests/day
 * Docs: https://financialmodelingprep.com/developer/docs/
 *
 * NOTE: FMP economic calendar endpoint is now a legacy endpoint (deprecated Aug 31, 2025)
 * Falls back to mock data for testing/development
 */

import {
  checkRateLimit,
  incrementRateLimit,
} from "@/lib/utils/rateLimiter";
import { generateMockEconomicEvents } from "./mockEconomicData";

// Types
export interface EconomicEvent {
  id: string;
  eventId: string;
  date: Date;
  time: string;
  country: string;
  currency?: string;
  event: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  category: string;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  source: string;
}

interface FMPEvent {
  event: string;
  date: string; // "2025-11-20 10:00:00"
  country: string;
  currency: string | null;
  previous: string;
  estimate: string;
  actual: string;
  change: string;
  changePercentage: string;
  impact: string; // "Low", "Medium", "High"
}

interface SymbolInfo {
  currencies: string[];
  countries: string[];
  assetType: "forex" | "crypto" | "stock" | "commodity" | "unknown";
}

// Cache for economic events
interface CacheEntry {
  data: EconomicEvent[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const eventCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Parse trading symbol to extract currencies and countries
 */
export function parseSymbolCurrencies(symbol: string): SymbolInfo {
  const sym = symbol.toUpperCase().replace(/[^A-Z]/g, "");

  // Crypto pairs
  if (sym.includes("BTC") || sym.includes("ETH") || sym.includes("LTC")) {
    const crypto = sym.slice(0, 3);
    const fiat = sym.slice(3);
    return {
      currencies: [crypto, fiat],
      countries: fiat === "USD" ? ["US"] : fiat === "EUR" ? ["EU"] : [],
      assetType: "crypto",
    };
  }

  // Forex pairs (6 letters)
  if (sym.length === 6) {
    const base = sym.slice(0, 3);
    const quote = sym.slice(3);
    const countries: string[] = [];

    // Map currencies to countries
    if (base === "EUR" || quote === "EUR") countries.push("EU");
    if (base === "USD" || quote === "USD") countries.push("US");
    if (base === "GBP" || quote === "GBP") countries.push("GB");
    if (base === "JPY" || quote === "JPY") countries.push("JP");
    if (base === "CHF" || quote === "CHF") countries.push("CH");
    if (base === "AUD" || quote === "AUD") countries.push("AU");
    if (base === "CAD" || quote === "CAD") countries.push("CA");
    if (base === "NZD" || quote === "NZD") countries.push("NZ");

    return {
      currencies: [base, quote],
      countries,
      assetType: "forex",
    };
  }

  // Commodities
  if (sym.startsWith("XAU") || sym.startsWith("XAG")) {
    const metal = sym.slice(0, 3);
    const currency = sym.slice(3) || "USD";
    return {
      currencies: [currency],
      countries: currency === "USD" ? ["US"] : [],
      assetType: "commodity",
    };
  }

  // Stocks (default to USD/US)
  return {
    currencies: ["USD"],
    countries: ["US"],
    assetType: "stock",
  };
}

/**
 * Format date for FMP API (YYYY-MM-DD)
 */
function formatDateForFMP(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse FMP impact level to standard enum
 */
function parseImpactLevel(fmpImpact: string): "LOW" | "MEDIUM" | "HIGH" {
  const impact = fmpImpact.toLowerCase();
  if (impact === "high") return "HIGH";
  if (impact === "medium") return "MEDIUM";
  return "LOW";
}

/**
 * Categorize event by name
 */
function categorizeEvent(eventName: string): string {
  const name = eventName.toLowerCase();

  if (name.includes("gdp")) return "GDP";
  if (
    name.includes("employment") ||
    name.includes("unemployment") ||
    name.includes("jobs") ||
    name.includes("nfp")
  ) {
    return "Employment";
  }
  if (
    name.includes("inflation") ||
    name.includes("cpi") ||
    name.includes("ppi")
  ) {
    return "Inflation";
  }
  if (
    name.includes("interest rate") ||
    name.includes("fed") ||
    name.includes("ecb") ||
    name.includes("boe")
  ) {
    return "CentralBank";
  }
  if (
    name.includes("trade") ||
    name.includes("export") ||
    name.includes("import")
  ) {
    return "Trade";
  }
  if (name.includes("retail") || name.includes("consumer")) {
    return "Consumer";
  }
  if (name.includes("manufacturing") || name.includes("pmi")) {
    return "Manufacturing";
  }
  if (name.includes("housing")) {
    return "Housing";
  }

  return "Other";
}

/**
 * Generate unique event ID
 */
function generateEventId(event: FMPEvent): string {
  const dateStr = event.date.replace(/[:\s]/g, "");
  const eventStr = event.event.replace(/\s+/g, "_");
  return `${event.country}_${dateStr}_${eventStr}`.toLowerCase();
}

/**
 * Parse FMP date string to Date and time
 */
function parseFMPDate(dateStr: string): { date: Date; time: string } {
  // Format: "2025-11-20 10:00:00"
  const [datePart, timePart] = dateStr.split(" ");
  const date = new Date(datePart + "T" + timePart + "Z"); // Parse as UTC
  const time = timePart.slice(0, 5); // "10:00"
  return { date, time };
}

/**
 * Map FMP response to EconomicEvent
 */
function mapFMPToEvent(fmpEvent: FMPEvent): EconomicEvent {
  const { date, time } = parseFMPDate(fmpEvent.date);
  const eventId = generateEventId(fmpEvent);

  return {
    id: eventId,
    eventId,
    date,
    time,
    country: fmpEvent.country,
    currency: fmpEvent.currency || undefined,
    event: fmpEvent.event,
    impact: parseImpactLevel(fmpEvent.impact),
    category: categorizeEvent(fmpEvent.event),
    actual: fmpEvent.actual || undefined,
    forecast: fmpEvent.estimate || undefined,
    previous: fmpEvent.previous || undefined,
    source: "FMP",
  };
}

/**
 * Get cache key for events query
 */
function getCacheKey(
  startDate: Date,
  endDate: Date,
  countries?: string[],
  currencies?: string[]
): string {
  const start = formatDateForFMP(startDate);
  const end = formatDateForFMP(endDate);
  const countriesStr = countries?.sort().join(",") || "all";
  const currenciesStr = currencies?.sort().join(",") || "all";
  return `events_${start}_${end}_${countriesStr}_${currenciesStr}`;
}

/**
 * Fetch economic events from FMP API
 */
export async function fetchEconomicEvents(params: {
  startDate: Date;
  endDate: Date;
  countries?: string[];
  currencies?: string[];
}): Promise<EconomicEvent[]> {
  const { startDate, endDate, countries, currencies } = params;

  // Check cache first
  const cacheKey = getCacheKey(startDate, endDate, countries, currencies);
  const cached = eventCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`[EconomicCalendar] Using cached events for ${cacheKey}`);
    return cached.data;
  }

  // Check rate limit
  if (!checkRateLimit("FMP", 250)) {
    console.warn(
      "[EconomicCalendar] Rate limit reached, using cached data if available"
    );
    // Return stale cache if available
    if (cached) {
      return cached.data;
    }
    // Return empty array if no cache
    console.error("[EconomicCalendar] No cached data available");
    return [];
  }

  // NOTE: Using mock data since FMP economic calendar is a legacy endpoint
  // Economic calendar endpoint requires paid Finnhub plan or alternative API
  console.log(`[EconomicCalendar] Using mock economic data for testing`);

  try {
    // Generate mock events
    let events = generateMockEconomicEvents(startDate, endDate, countries);

    // Filter by countries if specified
    if (countries && countries.length > 0) {
      events = events.filter((event) => countries.includes(event.country));
    }

    // Filter by currencies if specified
    if (currencies && currencies.length > 0) {
      events = events.filter(
        (event) => event.currency && currencies.includes(event.currency)
      );
    }

    // Remove duplicates
    const seen = new Set<string>();
    events = events.filter((event) => {
      if (seen.has(event.eventId)) {
        return false;
      }
      seen.add(event.eventId);
      return true;
    });

    // Cache the results
    const ttl = DEFAULT_CACHE_TTL;
    eventCache.set(cacheKey, {
      data: events,
      timestamp: Date.now(),
      ttl,
    });

    console.log(`[EconomicCalendar] Generated ${events.length} mock events`);

    return events;
  } catch (error) {
    console.error("[EconomicCalendar] Error fetching events:", error);

    // Return cached data if available
    if (cached) {
      console.log("[EconomicCalendar] Using stale cache due to error");
      return cached.data;
    }

    return [];
  }
}

/**
 * Filter events by timeframe
 */
export function filterEventsByTimeframe(
  events: EconomicEvent[],
  referenceDate: Date
): {
  upcomingEvents: EconomicEvent[];
  weeklyEvents: EconomicEvent[];
} {
  const refTime = referenceDate.getTime();
  const oneHour = 60 * 60 * 1000;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const upcomingEvents = events.filter((event) => {
    const eventTime = event.date.getTime();
    const diff = Math.abs(eventTime - refTime);
    return diff <= oneHour;
  });

  const weeklyEvents = events.filter((event) => {
    const eventTime = event.date.getTime();
    const diff = eventTime - refTime;
    return diff >= 0 && diff <= oneWeek;
  });

  // Sort by date and impact
  const sortFn = (a: EconomicEvent, b: EconomicEvent) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;

    const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  };

  return {
    upcomingEvents: upcomingEvents.sort(sortFn),
    weeklyEvents: weeklyEvents.sort(sortFn),
  };
}

/**
 * Calculate immediate risk level
 */
export function calculateImmediateRisk(
  events: EconomicEvent[]
): "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME" {
  if (events.length === 0) return "NONE";

  const highCount = events.filter((e) => e.impact === "HIGH").length;
  const mediumCount = events.filter((e) => e.impact === "MEDIUM").length;

  if (highCount >= 2) return "EXTREME";
  if (highCount === 1) return "HIGH";
  if (mediumCount >= 3) return "HIGH";
  if (mediumCount >= 1) return "MEDIUM";

  return "LOW";
}

/**
 * Get current rate limit count (for monitoring)
 */
function getRateLimitCount(apiName: string): number {
  // Import from rateLimiter
  const { getRateLimitCount: getCount } = require("@/lib/utils/rateLimiter");
  return getCount(apiName);
}
