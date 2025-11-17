/**
 * Server-side initialization
 * This file runs when the Next.js server starts
 */

import { initializeScheduler } from "./lib/jobs/scheduler";

// Initialize automation scheduler only in production or when explicitly enabled
if (
  process.env.ENABLE_AUTOMATION === "true" ||
  process.env.NODE_ENV === "production"
) {
  console.log("🚀 Initializing automation scheduler...");
  initializeScheduler();
} else {
  console.log(
    "⏭️ Automation scheduler disabled (set ENABLE_AUTOMATION=true to enable)"
  );
}

export {};
