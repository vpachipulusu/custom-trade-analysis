import * as cron from "node-cron";
import { runScheduledJobs } from "./autoAnalysis";

let schedulerInitialized = false;
let cronJob: cron.ScheduledTask | null = null;

export function initializeScheduler(): void {
  if (schedulerInitialized) {
    console.log("⏭️ Scheduler already initialized");
    return;
  }

  // Run every 5 minutes to check for due jobs
  // This checks the database for schedules that need to run
  cronJob = cron.schedule("*/5 * * * *", async () => {
    console.log(`\n⏰ Cron job triggered: ${new Date().toISOString()}`);
    try {
      await runScheduledJobs();
    } catch (error) {
      console.error("❌ Cron job error:", error);
    }
  });

  schedulerInitialized = true;
  console.log("✅ Automation scheduler initialized (runs every 5 minutes)");
  console.log(
    "🤖 The scheduler will check for due automation jobs and process them"
  );
}

export function stopScheduler(): void {
  if (cronJob) {
    cronJob.stop();
    schedulerInitialized = false;
    console.log("🛑 Automation scheduler stopped");
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerInitialized;
}

// Manual trigger for testing
export async function triggerSchedulerNow(): Promise<void> {
  console.log("🔄 Manual scheduler trigger");
  try {
    await runScheduledJobs();
    console.log("✅ Manual trigger completed");
  } catch (error) {
    console.error("❌ Manual trigger error:", error);
    throw error;
  }
}
