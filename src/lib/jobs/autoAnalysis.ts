import prisma from "@/lib/prisma";
import { captureWithPuppeteer } from "@/lib/services/puppeteer-screenshot";
import { analyzeChart } from "@/lib/services/openai";
import { sendTradingAlert, sendErrorAlert } from "@/lib/services/telegram";
import { decrypt } from "@/lib/utils/encryption";

interface AutomationJob {
  scheduleId: string;
  userId: string;
  layoutId: string;
  layoutIdTradingView: string | null;
  symbol: string | null;
  interval: string | null;
  sessionId: string;
  sessionidSign: string | null;
  telegramChatId?: string;
  includeChart?: boolean;
  includeEconomic?: boolean;
  onlyOnSignalChange?: boolean;
  minConfidence?: number;
  sendOnHold?: boolean;
}

export async function processAutomationJob(job: AutomationJob): Promise<void> {
  const startTime = Date.now();
  const {
    scheduleId,
    userId,
    layoutId,
    layoutIdTradingView,
    symbol,
    interval,
    sessionId,
    sessionidSign,
    telegramChatId,
  } = job;

  const layoutName = `${symbol || "Chart"} ${interval || ""}`;
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🤖 Starting automation job for layout: ${layoutName}`);
  console.log(`📋 Schedule ID: ${scheduleId}`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`📊 Layout ID: ${layoutId}`);
  console.log(`⚙️ Settings:`, {
    telegramEnabled: !!telegramChatId,
    chatId: telegramChatId,
    onlyOnSignalChange: job.onlyOnSignalChange,
    minConfidence: job.minConfidence,
    sendOnHold: job.sendOnHold,
    includeChart: job.includeChart,
    includeEconomic: job.includeEconomic,
  });
  console.log(`${"=".repeat(80)}\n`);

  // Create job log
  const jobLog = await prisma.automationJobLog.create({
    data: {
      scheduleId,
      status: "running",
      telegramChatId: telegramChatId || null,
    },
  });

  let logData: any = {
    completedAt: new Date(),
    duration: 0,
  };

  try {
    // Step 1: Decrypt session ID (or use as-is if not encrypted)
    let decryptedSessionId: string;
    let decryptedSessionidSign: string | null = null;
    try {
      // Check if sessionId is encrypted (format: iv:encryptedData)
      if (sessionId.includes(":")) {
        decryptedSessionId = decrypt(sessionId);
        if (sessionidSign) {
          decryptedSessionidSign = decrypt(sessionidSign);
        }
      } else {
        // Use plaintext values (backward compatibility)
        decryptedSessionId = sessionId;
        decryptedSessionidSign = sessionidSign;
      }
    } catch (error) {
      console.error("Session decryption error:", error);
      throw new Error("Failed to decrypt sessionid");
    }

    if (!layoutIdTradingView || !sessionidSign) {
      throw new Error("Missing layoutId or sessionidSign");
    }

    // Step 2: Capture chart screenshot using Puppeteer
    console.log(`📸 Capturing screenshot for layout: ${layoutIdTradingView}`);
    const imagePath = await captureWithPuppeteer({
      layoutId: layoutIdTradingView,
      sessionid: decryptedSessionId,
      sessionidSign: decryptedSessionidSign!,
    });

    console.log(`✅ Screenshot saved: ${imagePath}`);

    // Step 3: Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Step 4: Create snapshot record
    const snapshot = await prisma.snapshot.create({
      data: {
        layoutId,
        url: `https://www.tradingview.com/chart/${layoutIdTradingView}/`,
        imageData: imagePath,
        expiresAt,
      },
    });

    console.log(`✅ Snapshot created: ${snapshot.id}`);

    // Step 5: Analyze with OpenAI
    console.log(`🧠 Analyzing chart with AI...`);
    const analysisResult = await analyzeChart(imagePath);

    // Step 6: Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        snapshotId: snapshot.id,
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
        tradeSetup: analysisResult.tradeSetup
          ? JSON.parse(JSON.stringify(analysisResult.tradeSetup))
          : null,
      },
      include: {
        snapshot: {
          include: {
            layout: {
              select: {
                symbol: true,
                interval: true,
              },
            },
          },
        },
      },
    });

    console.log(
      `✅ Analysis created: ${analysis.id} - ${analysis.action} (${analysis.confidence}%)`
    );

    // Step 7: Check if we should send alert
    let shouldSendAlert = true;
    let signalChanged = false;
    let previousAnalysis = null;

    // Check previous analysis if "only on signal change" is enabled
    if (job.onlyOnSignalChange) {
      previousAnalysis = await prisma.analysis.findFirst({
        where: {
          userId,
          snapshot: { layoutId },
          id: { not: analysis.id },
        },
        orderBy: { createdAt: "desc" },
      });

      if (previousAnalysis) {
        signalChanged = previousAnalysis.action !== analysis.action;
        shouldSendAlert = signalChanged;
        console.log(
          `📊 Signal change check: ${previousAnalysis.action} → ${analysis.action} (Changed: ${signalChanged})`
        );
      }
    }

    // Check minimum confidence
    if (job.minConfidence) {
      console.log(`\n📊 Confidence Check:`);
      console.log(`   Current: ${analysis.confidence}%`);
      console.log(`   Minimum: ${job.minConfidence}%`);

      if (analysis.confidence < job.minConfidence) {
        shouldSendAlert = false;
        console.log(`   ❌ Result: Below threshold - Alert SKIPPED`);
      } else {
        console.log(`   ✅ Result: Above threshold - Check passed`);
      }
    }

    // Check if HOLD should be sent
    if (analysis.action === "HOLD") {
      console.log(`\n⏸️ HOLD Action Check:`);
      console.log(`   Action: ${analysis.action}`);
      console.log(`   Send HOLD enabled: ${job.sendOnHold}`);

      if (!job.sendOnHold) {
        shouldSendAlert = false;
        console.log(`   ❌ Result: HOLD disabled - Alert SKIPPED`);
      } else {
        console.log(`   ✅ Result: HOLD enabled - Check passed`);
      }
    }

    // Step 8: Send Telegram alert if configured and conditions met
    let telegramSent = false;

    console.log(`\n📱 Telegram Alert Decision:`);
    console.log(`   Should send: ${shouldSendAlert}`);
    console.log(`   Chat ID configured: ${!!telegramChatId}`);
    console.log(`   Chat ID: ${telegramChatId || "N/A"}`);

    if (shouldSendAlert && telegramChatId) {
      try {
        console.log(`\n📤 Sending Telegram alert...`);
        console.log(`   To: ${telegramChatId}`);
        console.log(`   Include Chart: ${job.includeChart}`);
        console.log(`   Include Economic: ${job.includeEconomic}`);
        console.log(`   Image Path: ${imagePath}`);

        await sendTradingAlert({
          analysis: analysis as any,
          chatId: telegramChatId,
          includeChart: job.includeChart,
          includeEconomic: job.includeEconomic,
          chartImagePath: imagePath,
        });

        telegramSent = true;
        console.log(`\n✅ TELEGRAM ALERT SENT SUCCESSFULLY`);
        console.log(`   Message: ${analysis.action} ${analysis.confidence}%`);
        console.log(`   Layout: ${layoutName}`);
      } catch (error) {
        console.error(`\n❌ TELEGRAM SEND FAILED:`, error);
        console.error(`   Error details:`, (error as Error).message);
        console.error(`   Stack:`, (error as Error).stack);
        // Don't throw - job should still be marked as successful
      }
    } else {
      console.log(`\n⏭️ TELEGRAM ALERT SKIPPED`);
      console.log(
        `   Reason: ${
          !shouldSendAlert ? "Conditions not met" : "No chat ID configured"
        }`
      );
    }

    // Step 9: Record analysis history
    await prisma.analysisHistory.create({
      data: {
        analysisId: analysis.id,
        previousAction: job.onlyOnSignalChange
          ? (
              await prisma.analysis.findFirst({
                where: {
                  userId,
                  snapshot: { layoutId },
                  id: { not: analysis.id },
                },
                orderBy: { createdAt: "desc" },
              })
            )?.action || "NONE"
          : "NONE",
        newAction: analysis.action,
        signalChanged,
        notificationSent: telegramSent,
        sentAt: telegramSent ? new Date() : null,
      },
    });

    // Step 10: Update automation schedule
    const duration = Date.now() - startTime;

    // Update job log with success
    logData = {
      ...logData,
      status: "success",
      duration,
      action: analysis.action,
      confidence: analysis.confidence,
      previousAction: previousAnalysis?.action || null,
      signalChanged,
      metMinConfidence:
        !job.minConfidence || analysis.confidence >= job.minConfidence,
      telegramSent,
      screenshotPath: imagePath,
      analysisId: analysis.id,
      skipReason: !shouldSendAlert
        ? `Filters not met: ${
            !signalChanged && job.onlyOnSignalChange ? "Signal unchanged" : ""
          }${
            job.minConfidence && analysis.confidence < job.minConfidence
              ? ` Confidence ${analysis.confidence}% < ${job.minConfidence}%`
              : ""
          }${
            !job.sendOnHold && analysis.action === "HOLD"
              ? " HOLD disabled"
              : ""
          }`.trim()
        : null,
    };

    await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(job),
      },
    });

    // Update job log
    await prisma.automationJobLog.update({
      where: { id: jobLog.id },
      data: logData,
    });

    console.log(`✅ Automation job completed in ${duration}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Automation job failed:`, error);

    // Update job log with error
    await prisma.automationJobLog.update({
      where: { id: jobLog.id },
      data: {
        status: "failed",
        duration,
        completedAt: new Date(),
        errorMessage: error.message,
        errorStack: error.stack,
        telegramError: telegramChatId ? error.message : null,
      },
    });

    // Send error notification if Telegram is configured
    if (telegramChatId) {
      try {
        await sendErrorAlert(
          telegramChatId,
          error.message,
          `${symbol || "Chart"} ${interval || ""}`
        );
      } catch (err) {
        console.error(`❌ Failed to send error alert:`, err);
      }
    }

    // Update schedule with error
    await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(job),
      },
    });

    throw error;
  }
}

function calculateNextRun(job: AutomationJob): Date {
  const now = new Date();

  // Get frequency from schedule (would be passed in job in real scenario)
  // For now, using simple intervals
  const intervals: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
  };

  const interval = intervals["1h"]; // Default to 1h
  return new Date(now.getTime() + interval);
}

export async function runScheduledJobs(): Promise<void> {
  console.log(`\n🔄 Checking for scheduled automation jobs...`);

  try {
    // Find all enabled schedules that are due to run
    const dueSchedules = await prisma.automationSchedule.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
      },
      include: {
        layout: true,
        user: {
          include: {
            telegramConfig: true,
          },
        },
      },
    });

    if (dueSchedules.length === 0) {
      console.log(`✅ No jobs due to run`);
      return;
    }

    console.log(`📋 Found ${dueSchedules.length} job(s) to process`);

    // Process each schedule
    for (const schedule of dueSchedules) {
      if (!schedule.layout.sessionid) {
        console.error(
          `❌ Layout ${schedule.layoutId} missing sessionid, skipping`
        );
        continue;
      }

      const job: AutomationJob = {
        scheduleId: schedule.id,
        userId: schedule.userId,
        layoutId: schedule.layoutId,
        layoutIdTradingView: schedule.layout.layoutId,
        symbol: schedule.layout.symbol,
        interval: schedule.layout.interval,
        sessionId: schedule.layout.sessionid,
        sessionidSign: schedule.layout.sessionidSign,
        telegramChatId: schedule.user.telegramConfig?.chatId,
        includeChart: schedule.user.telegramConfig?.includeChart ?? true,
        includeEconomic: schedule.user.telegramConfig?.includeEconomic ?? true,
        onlyOnSignalChange: schedule.onlyOnSignalChange,
        minConfidence: schedule.minConfidence,
        sendOnHold: schedule.sendOnHold,
      };

      try {
        await processAutomationJob(job);
      } catch (error) {
        console.error(`❌ Job failed for schedule ${schedule.id}:`, error);
        // Continue with other jobs
      }
    }

    console.log(`✅ All scheduled jobs processed\n`);
  } catch (error) {
    console.error(`❌ Error running scheduled jobs:`, error);
  }
}
