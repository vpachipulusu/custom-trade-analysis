/**
 * Server-side initialization
 * This file runs when the Next.js server starts
 */

import { initializeScheduler } from "./lib/jobs/scheduler";
import { getLogger } from "./lib/logging";

const logger = getLogger();

// Initialize automation scheduler only in production or when explicitly enabled
if (
  process.env.ENABLE_AUTOMATION === "true" ||
  process.env.NODE_ENV === "production"
) {
  logger.info("Initializing automation scheduler");
  initializeScheduler();
} else {
  logger.info("Automation scheduler disabled", {
    message: "Set ENABLE_AUTOMATION=true to enable"
  });
}

export {};
