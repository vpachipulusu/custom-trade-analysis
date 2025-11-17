/**
 * Mock Economic Calendar Data
 * This provides sample economic events for testing and development
 * Replace with real API when available
 */

import { EconomicEvent } from "./economicCalendar";
import { addDays, addHours, subHours } from "date-fns";

export function generateMockEconomicEvents(
  startDate: Date,
  endDate: Date,
  countries?: string[]
): EconomicEvent[] {
  const now = new Date();
  const events: EconomicEvent[] = [];

  // High impact events
  const highImpactEvents = [
    {
      event: "Federal Funds Rate Decision",
      country: "US",
      currency: "USD",
      category: "INTEREST_RATE",
      impact: "HIGH" as const,
      forecast: "5.25%",
      previous: "5.00%",
    },
    {
      event: "Non-Farm Payrolls (NFP)",
      country: "US",
      currency: "USD",
      category: "EMPLOYMENT",
      impact: "HIGH" as const,
      forecast: "180K",
      previous: "175K",
    },
    {
      event: "Consumer Price Index (CPI)",
      country: "US",
      currency: "USD",
      category: "INFLATION",
      impact: "HIGH" as const,
      forecast: "3.2%",
      previous: "3.1%",
    },
    {
      event: "ECB Interest Rate Decision",
      country: "EU",
      currency: "EUR",
      category: "INTEREST_RATE",
      impact: "HIGH" as const,
      forecast: "4.00%",
      previous: "3.75%",
    },
    {
      event: "BoE Interest Rate Decision",
      country: "GB",
      currency: "GBP",
      category: "INTEREST_RATE",
      impact: "HIGH" as const,
      forecast: "5.25%",
      previous: "5.00%",
    },
    {
      event: "GDP Growth Rate (QoQ)",
      country: "US",
      currency: "USD",
      category: "GDP",
      impact: "HIGH" as const,
      forecast: "2.1%",
      previous: "2.0%",
    },
  ];

  // Medium impact events
  const mediumImpactEvents = [
    {
      event: "Retail Sales (MoM)",
      country: "US",
      currency: "USD",
      category: "CONSUMER",
      impact: "MEDIUM" as const,
      forecast: "0.3%",
      previous: "0.2%",
    },
    {
      event: "Manufacturing PMI",
      country: "US",
      currency: "USD",
      category: "MANUFACTURING",
      impact: "MEDIUM" as const,
      forecast: "51.2",
      previous: "50.8",
    },
    {
      event: "Unemployment Rate",
      country: "US",
      currency: "USD",
      category: "EMPLOYMENT",
      impact: "MEDIUM" as const,
      forecast: "3.8%",
      previous: "3.7%",
    },
    {
      event: "Producer Price Index (PPI)",
      country: "US",
      currency: "USD",
      category: "INFLATION",
      impact: "MEDIUM" as const,
      forecast: "1.8%",
      previous: "1.6%",
    },
    {
      event: "Trade Balance",
      country: "US",
      currency: "USD",
      category: "TRADE",
      impact: "MEDIUM" as const,
      forecast: "-$65B",
      previous: "-$63B",
    },
    {
      event: "German IFO Business Climate",
      country: "EU",
      currency: "EUR",
      category: "MANUFACTURING",
      impact: "MEDIUM" as const,
      forecast: "87.5",
      previous: "86.9",
    },
  ];

  // Low impact events
  const lowImpactEvents = [
    {
      event: "Building Permits",
      country: "US",
      currency: "USD",
      category: "HOUSING",
      impact: "LOW" as const,
      forecast: "1.45M",
      previous: "1.42M",
    },
    {
      event: "Initial Jobless Claims",
      country: "US",
      currency: "USD",
      category: "EMPLOYMENT",
      impact: "LOW" as const,
      forecast: "210K",
      previous: "215K",
    },
    {
      event: "Factory Orders",
      country: "US",
      currency: "USD",
      category: "MANUFACTURING",
      impact: "LOW" as const,
      forecast: "0.2%",
      previous: "0.1%",
    },
  ];

  const allEvents = [
    ...highImpactEvents,
    ...mediumImpactEvents,
    ...lowImpactEvents,
  ];

  // Generate events across the date range
  let currentDate = new Date(startDate);
  let eventIdCounter = 1;

  while (currentDate <= endDate) {
    // Add 2-4 events per day
    const eventsPerDay = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < eventsPerDay; i++) {
      const template = allEvents[Math.floor(Math.random() * allEvents.length)];

      // Filter by country if specified
      if (countries && countries.length > 0 && !countries.includes("ALL")) {
        if (!countries.includes(template.country)) {
          continue;
        }
      }

      // Random time between 8 AM and 4 PM
      const hour = 8 + Math.floor(Math.random() * 9);
      const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      const eventDate = new Date(currentDate);
      eventDate.setHours(hour, minute, 0, 0);

      // Determine if event is in the past or future
      const isPast = eventDate < now;
      const hasActual = isPast || Math.random() > 0.7; // 30% chance of early release

      // Generate realistic actual values
      let actual: string | undefined;
      if (hasActual && template.forecast) {
        const forecastNum = parseFloat(
          template.forecast.replace(/[^0-9.-]/g, "")
        );
        if (!isNaN(forecastNum)) {
          // Actual can vary by ±20% from forecast
          const variance = forecastNum * (Math.random() * 0.4 - 0.2);
          const actualNum = forecastNum + variance;
          const suffix = template.forecast.replace(/[0-9.-]/g, "");
          actual = actualNum.toFixed(1) + suffix;
        }
      }

      const event: EconomicEvent = {
        id: `mock-${eventIdCounter}`,
        eventId: `${template.event
          .toLowerCase()
          .replace(/\s+/g, "-")}-${eventIdCounter}`,
        date: eventDate,
        time: `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`,
        country: template.country,
        currency: template.currency,
        event: template.event,
        impact: template.impact,
        category: template.category,
        forecast: template.forecast,
        previous: template.previous,
        actual,
        source: "Mock Data",
      };

      events.push(event);
      eventIdCounter++;
    }

    currentDate = addDays(currentDate, 1);
  }

  // Add a few events very close to "now" for immediate risk testing
  if (startDate <= now && now <= endDate) {
    // Event in 30 minutes
    events.push({
      id: `mock-urgent-1`,
      eventId: "fomc-press-conference",
      date: addHours(now, 0.5),
      time: addHours(now, 0.5).toTimeString().slice(0, 5),
      country: "US",
      currency: "USD",
      event: "FOMC Press Conference",
      impact: "HIGH",
      category: "INTEREST_RATE",
      forecast: undefined,
      previous: undefined,
      actual: undefined,
      source: "Mock Data",
    });

    // Event in 45 minutes
    events.push({
      id: `mock-urgent-2`,
      eventId: "ecb-monetary-policy",
      date: addHours(now, 0.75),
      time: addHours(now, 0.75).toTimeString().slice(0, 5),
      country: "EU",
      currency: "EUR",
      event: "ECB Monetary Policy Statement",
      impact: "HIGH",
      category: "INTEREST_RATE",
      forecast: undefined,
      previous: undefined,
      actual: undefined,
      source: "Mock Data",
    });

    // Event 15 minutes ago (just happened)
    events.push({
      id: `mock-urgent-3`,
      eventId: "nfp-release",
      date: subHours(now, 0.25),
      time: subHours(now, 0.25).toTimeString().slice(0, 5),
      country: "US",
      currency: "USD",
      event: "Non-Farm Payrolls",
      impact: "HIGH",
      category: "EMPLOYMENT",
      forecast: "180K",
      previous: "175K",
      actual: "195K", // Beat expectations
      source: "Mock Data",
    });
  }

  // Sort by date
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
