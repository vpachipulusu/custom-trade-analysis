import prisma from "@/lib/prisma";
import { captureWithPuppeteer } from "@/lib/services/puppeteer-screenshot";
import { sendTradingAlert, sendErrorAlert } from "@/lib/services/telegram";
import { decrypt } from "@/lib/utils/encryption";
import { getLogger } from "../logging";
import { enforceSnapshotLimit } from "@/lib/db/snapshotCleanup";
import { getLayoutsBySymbol } from "@/lib/db/layouts";
import {
  executeCompleteAnalysis,
  executeCompleteMultiLayoutAnalysis,
  parseAIModel,
  enrichWithEconomicContext,
} from "@/lib/services/analysisService";

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
  defaultAiModel?: string; // User's preferred AI model from settings
  frequency?: string; // Schedule frequency (15m, 1h, 4h, 1d, 1w)
  useMultiLayout?: boolean; // Analyze all layouts for the symbol
}

/**
 * Process multi-layout automation job
 * Captures snapshots for all layouts of a symbol and analyzes them together
 */
async function processMultiLayoutAutomationJob(
  job: AutomationJob,
  context: {
    userId: string;
    symbol: string;
    decryptedSessionId: string;
    decryptedSessionidSign: string;
    jobLog: any;
    startTime: number;
  }
): Promise<void> {
  const logger = getLogger();
  const { userId, symbol, decryptedSessionId, decryptedSessionidSign, jobLog, startTime } = context;

  try {
    // Get all layouts for the symbol
    const layouts = await getLayoutsBySymbol(userId, symbol);

    if (!layouts || layouts.length === 0) {
      throw new Error(`No layouts found for symbol ${symbol}`);
    }

    logger.info("Found layouts for multi-layout analysis", {
      symbol,
      layoutCount: layouts.length,
      intervals: layouts.map((l) => l.interval).join(", "),
    });

    const layoutsWithSnapshots: Array<{
      layoutId: string;
      interval: string;
      imageUrl: string;
      snapshotId: string;
    }> = [];

    // Capture snapshots for all layouts
    for (const layout of layouts) {
      try {
        if (!layout.layoutId) {
          logger.warn("Layout missing layoutId, skipping", {
            layoutDbId: layout.id,
            symbol,
          });
          continue;
        }

        logger.info("Capturing snapshot for layout", {
          layoutId: layout.layoutId,
          interval: layout.interval,
        });

        const imagePath = await captureWithPuppeteer({
          layoutId: layout.layoutId,
          sessionid: decryptedSessionId,
          sessionidSign: decryptedSessionidSign,
        });

        // Enforce snapshot limit - delete oldest if needed
        await enforceSnapshotLimit(layout.id);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const snapshot = await prisma.snapshot.create({
          data: {
            layoutId: layout.id,
            url: `https://www.tradingview.com/chart/${layout.layoutId}/`,
            imageData: imagePath,
            expiresAt,
          },
        });

        layoutsWithSnapshots.push({
          layoutId: layout.id,
          interval: layout.interval || "Unknown",
          imageUrl: imagePath,
          snapshotId: snapshot.id,
        });

        logger.info("Snapshot captured for multi-layout", {
          snapshotId: snapshot.id,
          layoutId: layout.layoutId,
          interval: layout.interval,
        });
      } catch (error) {
        logger.error("Failed to capture snapshot for layout", {
          layoutId: layout.layoutId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other layouts
      }
    }

    if (layoutsWithSnapshots.length === 0) {
      throw new Error("Failed to capture any snapshots for multi-layout analysis");
    }

    // Perform multi-layout analysis
    logger.info("Performing multi-layout analysis", {
      symbol,
      layoutCount: layoutsWithSnapshots.length,
    });

    const { analysis, economicContext } = await executeCompleteMultiLayoutAnalysis({
      userId,
      layouts: layoutsWithSnapshots,
      symbol,
      aiModel: job.defaultAiModel,
      isAutomated: true,
    });

    logger.info("Multi-layout analysis completed", {
      analysisId: analysis.id,
      action: analysis.action,
      confidence: analysis.confidence,
      layoutCount: layoutsWithSnapshots.length,
    });

    // Check if we should send alert (same logic as single layout)
    let shouldSendAlert = true;
    let signalChanged = false;
    let previousAnalysis = null;

    if (job.onlyOnSignalChange) {
      previousAnalysis = await prisma.analysis.findFirst({
        where: {
          userId,
          isAutomated: true,
          isMultiLayout: true,
          snapshot: {
            layout: {
              symbol,
            },
          },
          id: { not: analysis.id },
        },
        orderBy: { createdAt: "desc" },
      });

      if (previousAnalysis) {
        signalChanged = previousAnalysis.action !== analysis.action;
        shouldSendAlert = signalChanged;
        logger.info("Signal change check (multi-layout)", {
          previousAction: previousAnalysis.action,
          currentAction: analysis.action,
          changed: signalChanged,
        });
      }
    }

    if (job.minConfidence && analysis.confidence < job.minConfidence) {
      shouldSendAlert = false;
      logger.info("Confidence threshold not met", {
        current: analysis.confidence,
        minimum: job.minConfidence,
      });
    }

    if (analysis.action === "HOLD" && !job.sendOnHold) {
      shouldSendAlert = false;
      logger.info("HOLD action skipped (sendOnHold disabled)");
    }

    // Send Telegram alert if conditions met
    let telegramSent = false;
    if (shouldSendAlert && job.telegramChatId) {
      try {
        // Use the first layout's image for the alert
        await sendTradingAlert({
          analysis: analysis as any,
          chatId: job.telegramChatId,
          includeChart: job.includeChart,
          includeEconomic: job.includeEconomic,
          chartImagePath: layoutsWithSnapshots[0].imageUrl,
        });
        telegramSent = true;
        logger.info("Telegram alert sent for multi-layout analysis");
      } catch (error) {
        logger.error("Telegram send failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Record analysis history
    await prisma.analysisHistory.create({
      data: {
        analysisId: analysis.id,
        previousAction: previousAnalysis?.action || "NONE",
        newAction: analysis.action,
        signalChanged,
        notificationSent: telegramSent,
        sentAt: telegramSent ? new Date() : null,
      },
    });

    // Update job log
    const duration = Date.now() - startTime;
    await prisma.automationJobLog.update({
      where: { id: jobLog.id },
      data: {
        status: "success",
        duration,
        action: analysis.action,
        confidence: analysis.confidence,
        previousAction: previousAnalysis?.action || null,
        signalChanged,
        metMinConfidence: !job.minConfidence || analysis.confidence >= job.minConfidence,
        telegramSent,
        screenshotPath: layoutsWithSnapshots[0].imageUrl,
        analysisId: analysis.id,
        completedAt: new Date(),
        skipReason: !shouldSendAlert
          ? `Filters not met: ${
              !signalChanged && job.onlyOnSignalChange ? "Signal unchanged" : ""
            }${
              job.minConfidence && analysis.confidence < job.minConfidence
                ? ` Confidence ${analysis.confidence}% < ${job.minConfidence}%`
                : ""
            }${!job.sendOnHold && analysis.action === "HOLD" ? " HOLD disabled" : ""}`
              .trim()
          : null,
      },
    });

    // Update schedule
    await prisma.automationSchedule.update({
      where: { id: job.scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(job),
      },
    });

    logger.info("Multi-layout automation job completed", {
      duration,
      layoutCount: layoutsWithSnapshots.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Multi-layout automation job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    await prisma.automationJobLog.update({
      where: { id: jobLog.id },
      data: {
        status: "failed",
        duration,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        telegramError: job.telegramChatId ? (error instanceof Error ? error.message : String(error)) : null,
      },
    });

    await prisma.automationSchedule.update({
      where: { id: job.scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(job),
      },
    });

    if (job.telegramChatId) {
      try {
        await sendErrorAlert(
          job.telegramChatId,
          error instanceof Error ? error.message : String(error),
          `Multi-layout analysis for ${symbol}`
        );
      } catch (err) {
        logger.error("Failed to send error alert", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    throw error;
  }
}

export async function processAutomationJob(job: AutomationJob): Promise<void> {
  const logger = getLogger();
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
  logger.info("Starting automation job", {
    layoutName,
    scheduleId,
    userId,
    layoutId,
    settings: {
      telegramEnabled: !!telegramChatId,
      chatId: telegramChatId,
      onlyOnSignalChange: job.onlyOnSignalChange,
      minConfidence: job.minConfidence,
      sendOnHold: job.sendOnHold,
      includeChart: job.includeChart,
      includeEconomic: job.includeEconomic,
    },
  });

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
      logger.error("Session decryption error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error("Failed to decrypt sessionid");
    }

    if (!layoutIdTradingView || !sessionidSign) {
      throw new Error("Missing layoutId or sessionidSign");
    }

    // DEBUG: Log job object fields
    logger.info("DEBUG: Multi-layout check values", {
      "job.useMultiLayout": job.useMultiLayout,
      "job.symbol": job.symbol,
      "symbol variable": symbol,
      "condition result": !!(job.useMultiLayout && symbol),
    });

    // Check if multi-layout analysis is enabled
    if (job.useMultiLayout && symbol) {
      logger.info("Multi-layout analysis enabled for automation", {
        symbol,
        scheduleId,
      });

      // Process multi-layout analysis
      await processMultiLayoutAutomationJob(job, {
        userId,
        symbol,
        decryptedSessionId,
        decryptedSessionidSign: decryptedSessionidSign!,
        jobLog,
        startTime,
      });
      return;
    }

    // Step 2: Capture chart screenshot using Puppeteer
    logger.info("Capturing screenshot", { layoutId: layoutIdTradingView });
    const imagePath = await captureWithPuppeteer({
      layoutId: layoutIdTradingView,
      sessionid: decryptedSessionId,
      sessionidSign: decryptedSessionidSign!,
    });

    logger.info("Screenshot captured successfully", {
      dataLength: imagePath.length,
      preview: imagePath.substring(0, 50),
    });

    // Step 3: Enforce snapshot limit - delete oldest snapshots if needed
    await enforceSnapshotLimit(layoutId);

    // Step 4: Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Step 5: Create snapshot record
    logger.debug("Creating snapshot with imageData");
    const snapshot = await prisma.snapshot.create({
      data: {
        layoutId,
        url: `https://www.tradingview.com/chart/${layoutIdTradingView}/`,
        imageData: imagePath,
        expiresAt,
      },
    });

    logger.info("Snapshot created", {
      snapshotId: snapshot.id,
      hasImageData: !!snapshot.imageData,
      imageDataLength: snapshot.imageData?.length || 0,
    });

    // Step 6 & 7: Analyze with AI and create analysis record (using shared service)
    const { analysis, economicContext } = await executeCompleteAnalysis({
      userId,
      snapshotId: snapshot.id,
      imageUrl: imagePath,
      symbol: symbol || undefined,
      aiModel: job.defaultAiModel,
      isAutomated: true,
    });

    logger.info("Analysis created", {
      analysisId: analysis.id,
      action: analysis.action,
      confidence: analysis.confidence,
      aiModel: analysis.aiModel,
    });

    // Step 8: Check if we should send alert
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
        logger.info("Signal change check", {
          previousAction: previousAnalysis.action,
          currentAction: analysis.action,
          changed: signalChanged,
        });
      }
    }

    // Check minimum confidence
    if (job.minConfidence) {
      const metThreshold = analysis.confidence >= job.minConfidence;
      logger.info("Confidence check", {
        current: analysis.confidence,
        minimum: job.minConfidence,
        metThreshold,
        result: metThreshold ? "passed" : "skipped",
      });

      if (!metThreshold) {
        shouldSendAlert = false;
      }
    }

    // Check if HOLD should be sent
    if (analysis.action === "HOLD") {
      logger.info("HOLD action check", {
        action: analysis.action,
        sendOnHoldEnabled: job.sendOnHold,
        result: job.sendOnHold ? "passed" : "skipped",
      });

      if (!job.sendOnHold) {
        shouldSendAlert = false;
      }
    }

    // Step 9: Send Telegram alert if configured and conditions met
    let telegramSent = false;

    logger.info("Telegram alert decision", {
      shouldSend: shouldSendAlert,
      chatIdConfigured: !!telegramChatId,
      chatId: telegramChatId || "N/A",
    });

    if (shouldSendAlert && telegramChatId) {
      try {
        logger.info("Sending Telegram alert", {
          to: telegramChatId,
          includeChart: job.includeChart,
          includeEconomic: job.includeEconomic,
          imagePathLength: imagePath.length,
        });

        await sendTradingAlert({
          analysis: analysis as any,
          chatId: telegramChatId,
          includeChart: job.includeChart,
          includeEconomic: job.includeEconomic,
          chartImagePath: imagePath,
        });

        telegramSent = true;
        logger.info("Telegram alert sent successfully", {
          action: analysis.action,
          confidence: analysis.confidence,
          layoutName,
        });
      } catch (error) {
        logger.error("Telegram send failed", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't throw - job should still be marked as successful
      }
    } else {
      logger.info("Telegram alert skipped", {
        reason: !shouldSendAlert
          ? "Conditions not met"
          : "No chat ID configured",
      });
    }

    // Step 10: Record analysis history
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

    // Step 11: Update automation schedule
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

    logger.info("Automation job completed", { duration });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("Automation job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

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
        logger.error("Failed to send error alert", {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
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

  // Interval durations in milliseconds
  const intervals: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
  };

  // Use the job's frequency if available, otherwise default to 1h
  const frequency = job.frequency || "1h";
  const interval = intervals[frequency] || intervals["1h"];

  return new Date(now.getTime() + interval);
}

export async function runScheduledJobs(manualTrigger: boolean = false): Promise<void> {
  const logger = getLogger();
  logger.info("Checking for scheduled automation jobs", { manualTrigger });

  try {
    // Build the where clause based on whether this is a manual trigger
    // Manual trigger: run ALL enabled jobs regardless of nextRunAt
    // Scheduled trigger: only run jobs that are due (nextRunAt is null or in the past)
    const whereClause: any = {
      enabled: true,
    };

    if (!manualTrigger) {
      whereClause.OR = [
        { nextRunAt: null },
        { nextRunAt: { lte: new Date() } }
      ];
    }

    // Find all enabled schedules (filtered by due time if not manual trigger)
    const dueSchedules = await prisma.automationSchedule.findMany({
      where: whereClause,
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
      logger.info("No jobs due to run");
      return;
    }

    logger.info("Found jobs to process", { count: dueSchedules.length });

    // Process each schedule
    for (const schedule of dueSchedules) {
      if (!schedule.user.sessionid) {
        logger.error(
          "User missing sessionid (configure in Dashboard Settings), skipping",
          {
            layoutId: schedule.layoutId,
            userId: schedule.userId,
          }
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
        sessionId: schedule.user.sessionid,
        sessionidSign: schedule.user.sessionidSign,
        telegramChatId: schedule.user.telegramConfig?.chatId,
        includeChart: schedule.user.telegramConfig?.includeChart ?? true,
        includeEconomic: schedule.user.telegramConfig?.includeEconomic ?? true,
        onlyOnSignalChange: schedule.onlyOnSignalChange,
        minConfidence: schedule.minConfidence,
        sendOnHold: schedule.sendOnHold,
        defaultAiModel: schedule.user.defaultAiModel || "gpt-4o", // Use user's default AI model
        frequency: schedule.frequency, // Add frequency for nextRunAt calculation
        useMultiLayout: schedule.useMultiLayout, // Multi-layout analysis option
      };

      try {
        await processAutomationJob(job);
      } catch (error) {
        logger.error("Job failed for schedule", {
          scheduleId: schedule.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue with other jobs
      }
    }

    logger.info("All scheduled jobs processed");
  } catch (error) {
    logger.error("Error running scheduled jobs", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
