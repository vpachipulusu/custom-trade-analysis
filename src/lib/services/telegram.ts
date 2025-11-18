import TelegramBot from "node-telegram-bot-api";
import { Analysis } from "@/hooks/useAnalyses";
import fs from "fs";
import { getLogger } from "../logging";

interface TradeSetup {
  quality: "A" | "B" | "C";
  entryPrice: number | null;
  stopLoss: number | null;
  targetPrice: number | null;
  riskRewardRatio: number | null;
  setupDescription: string;
  reasons?: string[];
}

// Initialize bot (will be set up when needed)
let bot: TelegramBot | null = null;

function initializeBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set in environment variables");
  }

  if (!bot) {
    bot = new TelegramBot(token, { polling: false });
  }

  return bot;
}

function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 90) return "🟢🟢🟢";
  if (confidence >= 70) return "🟢🟢⚪";
  if (confidence >= 50) return "🟢⚪⚪";
  if (confidence >= 30) return "🟡⚪⚪";
  return "🔴⚪⚪";
}

function getActionEmoji(action: string): string {
  switch (action) {
    case "BUY":
      return "📈 BUY";
    case "SELL":
      return "📉 SELL";
    case "HOLD":
      return "⏸️ HOLD";
    default:
      return action;
  }
}

function formatPrice(price: number): string {
  // Forex (< 10): 5 decimals
  if (price < 10) return price.toFixed(5);
  // Stocks (10-1000): 3 decimals
  if (price < 1000) return price.toFixed(3);
  // Gold (1000-10000): 2 decimals
  if (price < 10000) return price.toFixed(2);
  // BTC (> 10000): 2 decimals
  return price.toFixed(2);
}

interface TelegramAlertOptions {
  analysis: Analysis;
  chatId: string;
  includeChart?: boolean;
  includeEconomic?: boolean;
  chartImagePath?: string;
}

export async function sendTradingAlert(
  options: TelegramAlertOptions
): Promise<void> {
  const logger = getLogger();

  logger.info('Sending trading alert', {
    analysisId: options.analysis?.id,
    chatId: options.chatId,
    includeChart: options.includeChart,
    includeEconomic: options.includeEconomic,
    hasChartPath: !!options.chartImagePath
  });

  const {
    analysis,
    chatId,
    includeChart = true,
    includeEconomic = true,
    chartImagePath,
  } = options;

  logger.debug('Initializing Telegram bot');
  const bot = initializeBot();
  logger.debug('Telegram bot initialized');

  // Build message
  let message = `🤖 *Trade Analysis Alert*\n\n`;
  const layoutName = `${analysis.snapshot.layout?.symbol || "Chart"} ${
    analysis.snapshot.layout?.interval || ""
  }`;
  message += `📊 *${layoutName}*\n`;
  message += `⏰ ${new Date(analysis.createdAt).toLocaleString()}\n\n`;

  // Action
  message += `*Action:* ${getActionEmoji(analysis.action)}\n`;
  message += `*Confidence:* ${analysis.confidence}% ${getConfidenceEmoji(
    analysis.confidence
  )}\n\n`;

  // Trade Setup (if available and not HOLD)
  if (analysis.tradeSetup && analysis.action !== "HOLD") {
    const ts = analysis.tradeSetup as TradeSetup;
    if (ts.entryPrice && ts.stopLoss && ts.targetPrice) {
      message += `💼 *Trade Setup* (${ts.quality})\\n`;
      message += `Entry: \`${formatPrice(ts.entryPrice)}\`\\n`;
      message += `Stop Loss: \`${formatPrice(ts.stopLoss)}\`\\n`;
      message += `Target: \`${formatPrice(ts.targetPrice)}\`\\n`;

      const riskReward = (
        (ts.targetPrice - ts.entryPrice) /
        (ts.entryPrice - ts.stopLoss)
      ).toFixed(2);
      message += `R:R Ratio: \`1:${riskReward}\`\\n\\n`;

      if (ts.reasons && ts.reasons.length > 0) {
        message += `*Key Reasons:*\\n`;
        ts.reasons.slice(0, 3).forEach((reason: string, idx: number) => {
          message += `${idx + 1}. ${reason}\\n`;
        });
        message += "\\n";
      }
    }
  }

  // Reasons as summary
  if (analysis.reasons && analysis.reasons.length > 0) {
    const firstReason = analysis.reasons[0];
    message += `📝 *Analysis:* ${firstReason.substring(0, 150)}${
      firstReason.length > 150 ? "..." : ""
    }\n\n`;
  }

  // Economic Context (if available and requested)
  if (includeEconomic && analysis.economicContext) {
    const ec = analysis.economicContext as any;
    if (ec.immediateRisk && ec.immediateRisk !== "NONE") {
      message += `⚠️ *Economic Risk:* ${ec.immediateRisk}\n`;
    }
    if (ec.weeklyOutlook && ec.weeklyOutlook !== "NEUTRAL") {
      message += `📊 *Weekly Outlook:* ${ec.weeklyOutlook}\n`;
    }
    message += "\n";
  }

  message += `🔗 [View Full Analysis](${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/analysis/${analysis.id})`;

  logger.debug('Message built', {
    messageLength: message.length,
    preview: message.substring(0, 200)
  });

  try {
    // Send chart image if available
    if (includeChart && chartImagePath && fs.existsSync(chartImagePath)) {
      logger.debug('Sending Telegram photo with caption', {
        chatId,
        imagePath: chartImagePath
      });

      await bot.sendPhoto(chatId, chartImagePath, {
        caption: message,
        parse_mode: "Markdown",
      });

      logger.info('Telegram photo sent successfully', {
        chatId,
        analysisId: analysis.id
      });
    } else {
      logger.debug('Sending Telegram text message', {
        chatId,
        includeChart,
        hasPath: !!chartImagePath,
        pathExists: chartImagePath ? fs.existsSync(chartImagePath) : false
      });

      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });

      logger.info('Telegram text message sent successfully', {
        chatId,
        analysisId: analysis.id
      });
    }

    logger.info('Telegram alert delivered', {
      chatId,
      analysisId: analysis.id
    });
  } catch (error) {
    logger.error("Failed to send Telegram alert", {
      chatId,
      analysisId: analysis.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

interface TestConnectionOptions {
  chatId: string;
}

export async function testTelegramConnection(
  options: TestConnectionOptions
): Promise<boolean> {
  const { chatId } = options;
  const logger = getLogger();

  try {
    const bot = initializeBot();

    await bot.sendMessage(
      chatId,
      "✅ *Telegram Connection Successful!*\n\n" +
        "Your trading alerts will be sent to this chat.\n\n" +
        "🤖 Automation is now active!",
      { parse_mode: "Markdown" }
    );

    logger.info('Telegram test message sent successfully', { chatId });
    return true;
  } catch (error) {
    logger.error("Telegram connection test failed", {
      chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

export async function sendErrorAlert(
  chatId: string,
  error: string,
  layoutName: string
): Promise<void> {
  const logger = getLogger();

  try {
    const bot = initializeBot();

    const message =
      `⚠️ *Automation Error*\n\n` +
      `📊 Layout: ${layoutName}\n` +
      `❌ Error: ${error}\n\n` +
      `⏰ ${new Date().toLocaleString()}`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
    });
  } catch (err) {
    logger.error("Failed to send error alert", {
      chatId,
      layoutName,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}

export async function getChatInfo(chatId: string): Promise<any> {
  const logger = getLogger();

  try {
    const bot = initializeBot();
    const chat = await bot.getChat(chatId);
    return chat;
  } catch (error) {
    logger.error("Failed to get chat info", {
      chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
