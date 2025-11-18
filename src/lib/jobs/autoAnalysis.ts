import prisma from "@/lib/prisma";
import { captureWithPuppeteer } from "@/lib/services/puppeteer-screenshot";
import { analyzeChart } from "@/lib/services/openai";
import { sendTradingAlert, sendErrorAlert } from "@/lib/services/telegram";
import { decrypt } from "@/lib/utils/encryption";
import { getLogger } from "../logging";

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
  logger.info('Starting automation job', {
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
    }
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
      logger.error('Session decryption error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error("Failed to decrypt sessionid");
    }

    if (!layoutIdTradingView || !sessionidSign) {
      throw new Error("Missing layoutId or sessionidSign");
    }

    // Step 2: Capture chart screenshot using Puppeteer
    logger.info('Capturing screenshot', { layoutId: layoutIdTradingView });
    const imagePath = await captureWithPuppeteer({
      layoutId: layoutIdTradingView,
      sessionid: decryptedSessionId,
      sessionidSign: decryptedSessionidSign!,
    });

    logger.info('Screenshot captured successfully', {
      dataLength: imagePath.length,
      preview: imagePath.substring(0, 50)
    });

    // Step 3: Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Step 4: Create snapshot record
    logger.debug('Creating snapshot with imageData');
    const snapshot = await prisma.snapshot.create({
      data: {
        layoutId,
        url: `https://www.tradingview.com/chart/${layoutIdTradingView}/`,
        imageData: imagePath,
        expiresAt,
      },
    });

    logger.info('Snapshot created', {
      snapshotId: snapshot.id,
      hasImageData: !!snapshot.imageData,
      imageDataLength: snapshot.imageData?.length || 0
    });

    // Step 5: Analyze with OpenAI
    logger.info('Analyzing chart with AI');
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

    logger.info('Analysis created', {
      analysisId: analysis.id,
      action: analysis.action,
      confidence: analysis.confidence
    });

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
        logger.info('Signal change check', {
          previousAction: previousAnalysis.action,
          currentAction: analysis.action,
          changed: signalChanged
        });
      }
    }

    // Check minimum confidence
    if (job.minConfidence) {
      const metThreshold = analysis.confidence >= job.minConfidence;
      logger.info('Confidence check', {
        current: analysis.confidence,
        minimum: job.minConfidence,
        metThreshold,
        result: metThreshold ? 'passed' : 'skipped'
      });

      if (!metThreshold) {
        shouldSendAlert = false;
      }
    }

    // Check if HOLD should be sent
    if (analysis.action === "HOLD") {
      logger.info('HOLD action check', {
        action: analysis.action,
        sendOnHoldEnabled: job.sendOnHold,
        result: job.sendOnHold ? 'passed' : 'skipped'
      });

      if (!job.sendOnHold) {
        shouldSendAlert = false;
      }
    }

    // Step 8: Send Telegram alert if configured and conditions met
    let telegramSent = false;

    logger.info('Telegram alert decision', {
      shouldSend: shouldSendAlert,
      chatIdConfigured: !!telegramChatId,
      chatId: telegramChatId || 'N/A'
    });

    if (shouldSendAlert && telegramChatId) {
      try {
        logger.info('Sending Telegram alert', {
          to: telegramChatId,
          includeChart: job.includeChart,
          includeEconomic: job.includeEconomic,
          imagePathLength: imagePath.length
        });

        await sendTradingAlert({
          analysis: analysis as any,
          chatId: telegramChatId,
          includeChart: job.includeChart,
          includeEconomic: job.includeEconomic,
          chartImagePath: imagePath,
        });

        telegramSent = true;
        logger.info('Telegram alert sent successfully', {
          action: analysis.action,
          confidence: analysis.confidence,
          layoutName
        });
      } catch (error) {
        logger.error('Telegram send failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Don't throw - job should still be marked as successful
      }
    } else {
      logger.info('Telegram alert skipped', {
        reason: !shouldSendAlert ? 'Conditions not met' : 'No chat ID configured'
      });
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

    logger.info('Automation job completed', { duration });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Automation job failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration
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
        logger.error('Failed to send error alert', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
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
  const logger = getLogger();
  logger.info('Checking for scheduled automation jobs');

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
      logger.info('No jobs due to run');
      return;
    }

    logger.info('Found jobs to process', { count: dueSchedules.length });

    // Process each schedule
    for (const schedule of dueSchedules) {
      if (!schedule.layout.sessionid) {
        logger.error('Layout missing sessionid, skipping', {
          layoutId: schedule.layoutId
        });
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
        logger.error('Job failed for schedule', {
          scheduleId: schedule.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continue with other jobs
      }
    }

    logger.info('All scheduled jobs processed');
  } catch (error) {
    logger.error('Error running scheduled jobs', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
