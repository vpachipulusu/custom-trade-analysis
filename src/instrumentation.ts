/**
 * Server-side initialization
 * This file runs when the Next.js server starts
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import only in Node.js runtime to avoid edge runtime issues
    const { initializeScheduler } = await import("./lib/jobs/scheduler");
    const { getLogger } = await import("./lib/logging");

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
        message: "Set ENABLE_AUTOMATION=true to enable",
      });
    }
  }
}
