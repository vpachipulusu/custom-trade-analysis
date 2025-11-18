import * as cron from "node-cron";
import { runScheduledJobs } from "./autoAnalysis";
import { getLogger } from "../logging";

let schedulerInitialized = false;
let cronJob: cron.ScheduledTask | null = null;

export function initializeScheduler(): void {
  const logger = getLogger();

  if (schedulerInitialized) {
    logger.info("Scheduler already initialized");
    return;
  }

  // Run every 5 minutes to check for due jobs
  // This checks the database for schedules that need to run
  cronJob = cron.schedule("*/5 * * * *", async () => {
    logger.debug('Cron job triggered', { timestamp: new Date().toISOString() });
    try {
      await runScheduledJobs();
    } catch (error) {
      logger.error('Cron job error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  schedulerInitialized = true;
  logger.info('Automation scheduler initialized', {
    interval: '5 minutes',
    description: 'Scheduler will check for due automation jobs and process them'
  });
}

export function stopScheduler(): void {
  const logger = getLogger();

  if (cronJob) {
    cronJob.stop();
    schedulerInitialized = false;
    logger.info('Automation scheduler stopped');
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerInitialized;
}

// Manual trigger for testing
export async function triggerSchedulerNow(): Promise<void> {
  const logger = getLogger();

  logger.info('Manual scheduler trigger');
  try {
    await runScheduledJobs();
    logger.info('Manual trigger completed');
  } catch (error) {
    logger.error('Manual trigger error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
