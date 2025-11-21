import axios from "axios";
import { AnalysisResult, EconomicImpactResult } from "./openai";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";
import { getLogger } from "../logging";
import { ANALYSIS_PROMPT } from "./prompts";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_KEY;

/**
 * Analyzes a TradingView chart using DeepSeek API
 * Note: DeepSeek currently doesn't support vision/image analysis
 * This provides a text-based placeholder response
 */
export async function analyzeChart(imageUrl: string): Promise<AnalysisResult> {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_KEY environment variable is not set");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // DeepSeek doesn't support image/vision analysis yet
    // Provide a text-based analysis request as fallback
    const textPrompt = `As a technical analyst, provide a general trading analysis in JSON format. Since image analysis is not available, provide a template analysis structure.

Return ONLY valid JSON in this exact format:
{
  "action": "HOLD",
  "confidence": 50,
  "timeframe": "swing",
  "reasons": [
    "Image analysis not supported by DeepSeek API - awaiting vision capability",
    "Manual chart review recommended for accurate technical analysis",
    "Consider using OpenAI analysis for image-based chart evaluation",
    "DeepSeek analysis will be available once vision API is released"
  ],
  "tradeSetup": {
    "quality": "C",
    "entryPrice": null,
    "stopLoss": null,
    "targetPrice": null,
    "riskRewardRatio": null,
    "setupDescription": "DeepSeek API does not currently support image/vision analysis. Please refer to the OpenAI analysis tab for chart-based technical analysis, or wait for DeepSeek to release their vision API capabilities."
  }
}`;

    // Make API request to DeepSeek (text-only)
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: textPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from DeepSeek API");
    }

    // Parse the JSON response
    const content = response.data.choices[0].message.content;
    const logger = getLogger();
    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse DeepSeek response", {
        content: content.substring(0, 500),
        error:
          parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI analysis result");
    }

    // Correct price magnitudes if needed
    if (analysisResult.tradeSetup) {
      analysisResult.tradeSetup = validateAndCorrectTradeSetup(
        analysisResult.tradeSetup,
        logger
      );
    }

    // Log the trade setup for debugging
    logger.debug("DeepSeek analysis result", {
      action: analysisResult.action,
      confidence: analysisResult.confidence,
      timeframe: analysisResult.timeframe,
      hasTradeSetup: !!analysisResult.tradeSetup,
    });

    // Validate and warn about trade setup issues
    if (analysisResult.tradeSetup) {
      const { entryPrice, stopLoss } = analysisResult.tradeSetup;

      if (entryPrice !== null && stopLoss !== null) {
        const priceDiff = Math.abs(entryPrice - stopLoss);
        const priceAvg = (entryPrice + stopLoss) / 2;
        const percentDiff = (priceDiff / priceAvg) * 100;

        logger.debug("Trade setup calculated", {
          entryPrice,
          stopLoss,
          priceDiff: priceDiff.toFixed(5),
          percentDiff: percentDiff.toFixed(2),
        });

        // Warn if entry and stop are too close (less than 0.1% difference)
        if (percentDiff < 0.1) {
          logger.warn("Entry and Stop Loss are nearly identical", {
            entryPrice,
            stopLoss,
            percentDiff,
          });
        }
      }
    }

    // Validate the response
    if (!validateAnalysisResult(analysisResult)) {
      throw new Error("Invalid analysis result from AI");
    }

    return analysisResult;
  } catch (error) {
    const logger = getLogger();
    logger.error("DeepSeek API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `DeepSeek API error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to DeepSeek API");
      }
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze chart"
    );
  }
}

/**
 * Analyzes multiple chart layouts using DeepSeek
 * Note: DeepSeek currently doesn't support vision/image analysis
 */
export async function analyzeMultipleLayouts(
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>
): Promise<AnalysisResult> {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_KEY environment variable is not set");
    }

    if (!layouts || layouts.length === 0) {
      throw new Error("At least one layout is required");
    }

    const logger = getLogger();
    logger.info("Starting DeepSeek multi-layout analysis (text-only placeholder)", {
      layoutCount: layouts.length,
      intervals: layouts.map((l) => l.interval).join(", "),
    });

    // If only one layout, use single chart analysis
    if (layouts.length === 1) {
      return await analyzeChart(layouts[0].imageUrl);
    }

    const textPrompt = `Provide a multi-timeframe analysis placeholder in JSON format. The intervals being analyzed are: ${layouts.map(l => l.interval).join(", ")}.

Return ONLY valid JSON:
{
  "action": "HOLD",
  "confidence": 50,
  "timeframe": "swing",
  "reasons": [
    "Multi-timeframe analysis not available - DeepSeek vision API pending",
    "Analyzed intervals: ${layouts.map(l => l.interval).join(", ")}",
    "Manual chart review recommended for ${layouts.length} timeframe analysis",
    "Refer to OpenAI tab for image-based multi-timeframe analysis"
  ],
  "tradeSetup": {
    "quality": "C",
    "entryPrice": null,
    "stopLoss": null,
    "targetPrice": null,
    "riskRewardRatio": null,
    "setupDescription": "DeepSeek multi-layout analysis unavailable due to lack of vision API support. Please use OpenAI analysis for chart-based evaluation."
  }
}`;

    // Make API request to DeepSeek (text-only)
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: textPrompt,
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from DeepSeek API");
    }

    // Parse the JSON response
    const content = response.data.choices[0].message.content;
    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse DeepSeek multi-layout response", {
        content: content.substring(0, 500),
        error:
          parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI multi-layout analysis result");
    }

    // Correct price magnitudes if needed
    if (analysisResult.tradeSetup) {
      analysisResult.tradeSetup = validateAndCorrectTradeSetup(
        analysisResult.tradeSetup,
        logger
      );
    }

    logger.info("DeepSeek multi-layout analysis completed", {
      layoutCount: layouts.length,
      intervals: layouts.map((l) => l.interval).join(", "),
      action: analysisResult.action,
      confidence: analysisResult.confidence,
    });

    // Validate the response
    if (!validateAnalysisResult(analysisResult)) {
      throw new Error("Invalid multi-layout analysis result from AI");
    }

    return analysisResult;
  } catch (error) {
    const logger = getLogger();
    logger.error("DeepSeek multi-layout API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `DeepSeek API error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to DeepSeek API");
      }
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to analyze multiple layouts"
    );
  }
}

/**
 * Analyze economic impact on trading decision using DeepSeek
 */
export async function analyzeEconomicImpact(params: {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  upcomingEvents: EconomicEvent[];
  weeklyEvents: EconomicEvent[];
}): Promise<EconomicImpactResult> {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_KEY environment variable is not set");
    }

    const { symbol, action, confidence, upcomingEvents, weeklyEvents } = params;

    // If no events, return safe defaults
    if (upcomingEvents.length === 0 && weeklyEvents.length === 0) {
      return {
        impactSummary: `No major economic events scheduled that would impact ${symbol}. The calendar is clear for trading.`,
        immediateRisk: "NONE",
        weeklyOutlook: "NEUTRAL",
        warnings: [],
        opportunities: [
          "Clear economic calendar provides stable trading environment",
        ],
        recommendation: `The ${action} signal on ${symbol} (${confidence}% confidence) is not conflicted by upcoming economic events. You may proceed based on technical analysis.`,
      };
    }

    const prompt = `You are an expert fundamental analyst and economist specializing in market events.

Analyze how these economic events will impact a ${action} position on ${symbol} (current signal confidence: ${confidence}%).

IMMEDIATE EVENTS (within 1 hour):
${JSON.stringify(upcomingEvents, null, 2)}

WEEKLY EVENTS (within 7 days):
${JSON.stringify(weeklyEvents, null, 2)}

Provide a comprehensive analysis. Return ONLY valid JSON:

{
  "impactSummary": "2-3 sentence overview of how these events affect ${symbol}",
  "immediateRisk": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
  "weeklyOutlook": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE",
  "warnings": [
    "Specific warning about high-risk event",
    "Another actionable warning"
  ],
  "opportunities": [
    "Specific opportunity or favorable timing",
    "Another strategic insight"
  ],
  "recommendation": "Clear 2-3 sentence recommendation on whether to take the ${action} trade now, wait, or modify strategy"
}

Consider:
1. How historically these types of events affect ${symbol}
2. The timing - are HIGH impact events too close to take action?
3. Conflicting signals between technical (${action}) and fundamental outlook
4. Specific numeric data (forecast vs previous) that creates volatility
5. Currency correlations for forex/crypto pairs

If no events exist, return NONE risk and NEUTRAL outlook with message about clear calendar.`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from DeepSeek");
    }

    const result: EconomicImpactResult = JSON.parse(content);

    // Validate result
    if (!isValidEconomicImpact(result)) {
      throw new Error("Invalid economic impact response format");
    }

    return result;
  } catch (error: any) {
    const logger = getLogger();
    logger.error("Error analyzing economic impact with DeepSeek", {
      error: error.message,
      stack: error.stack,
    });

    // Return safe fallback
    const immediateRisk = calculateImmediateRisk(params.upcomingEvents);

    return {
      impactSummary: `Economic event analysis unavailable. ${
        params.upcomingEvents.length + params.weeklyEvents.length
      } events detected for ${params.symbol}.`,
      immediateRisk,
      weeklyOutlook: "NEUTRAL",
      warnings:
        immediateRisk === "HIGH" || immediateRisk === "EXTREME"
          ? ["High-impact economic events detected within 1 hour"]
          : [],
      opportunities: [],
      recommendation: `Review economic calendar manually before executing ${params.action} on ${params.symbol}.`,
    };
  }
}

/**
 * Helper functions (copied from openai.ts for consistency)
 */

function correctPriceMagnitude(
  price: number | null,
  logger: any
): number | null {
  if (price === null || price === undefined) return null;

  if (price > 50 && price < 500) {
    const correctedPrice = price * 1000;

    if (
      (correctedPrice >= 80000 && correctedPrice <= 100000) ||
      (correctedPrice >= 2000 && correctedPrice <= 3000)
    ) {
      logger.warn("Detected incorrect price magnitude, correcting", {
        originalPrice: price,
        correctedPrice,
        multiplier: 1000,
      });
      return correctedPrice;
    }
  }

  return price;
}

function validateAndCorrectTradeSetup(tradeSetup: any, logger: any): any {
  if (!tradeSetup) return tradeSetup;

  const corrected = { ...tradeSetup };

  logger.debug("Trade setup before correction", {
    entryPrice: tradeSetup.entryPrice,
    stopLoss: tradeSetup.stopLoss,
    targetPrice: tradeSetup.targetPrice,
    riskRewardRatio: tradeSetup.riskRewardRatio,
  });

  if (tradeSetup.entryPrice !== null && tradeSetup.entryPrice !== undefined) {
    corrected.entryPrice = correctPriceMagnitude(tradeSetup.entryPrice, logger);
  }

  if (tradeSetup.stopLoss !== null && tradeSetup.stopLoss !== undefined) {
    corrected.stopLoss = correctPriceMagnitude(tradeSetup.stopLoss, logger);
  }

  if (tradeSetup.targetPrice !== null && tradeSetup.targetPrice !== undefined) {
    corrected.targetPrice = correctPriceMagnitude(
      tradeSetup.targetPrice,
      logger
    );
  }

  if (
    corrected.entryPrice !== null &&
    corrected.entryPrice !== undefined &&
    corrected.stopLoss !== null &&
    corrected.stopLoss !== undefined &&
    corrected.targetPrice !== null &&
    corrected.targetPrice !== undefined
  ) {
    const risk = Math.abs(corrected.entryPrice - corrected.stopLoss);
    const reward = Math.abs(corrected.targetPrice - corrected.entryPrice);
    if (risk > 0) {
      const newRatio = reward / risk;
      corrected.riskRewardRatio = newRatio;
      logger.debug("Recalculated risk-reward ratio", {
        entry: corrected.entryPrice,
        stop: corrected.stopLoss,
        target: corrected.targetPrice,
        risk,
        reward,
        oldRatio: tradeSetup.riskRewardRatio,
        newRatio,
      });
    }
  } else {
    logger.warn("Cannot calculate risk-reward ratio - missing prices", {
      hasEntry: corrected.entryPrice !== null && corrected.entryPrice !== undefined,
      hasStop: corrected.stopLoss !== null && corrected.stopLoss !== undefined,
      hasTarget:
        corrected.targetPrice !== null && corrected.targetPrice !== undefined,
      entryPrice: corrected.entryPrice,
      stopLoss: corrected.stopLoss,
      targetPrice: corrected.targetPrice,
    });
  }

  logger.debug("Trade setup after correction", {
    entryPrice: corrected.entryPrice,
    stopLoss: corrected.stopLoss,
    targetPrice: corrected.targetPrice,
    riskRewardRatio: corrected.riskRewardRatio,
  });

  return corrected;
}

function validateAnalysisResult(result: any): result is AnalysisResult {
  if (!result || typeof result !== "object") {
    return false;
  }

  if (!["BUY", "SELL", "HOLD"].includes(result.action)) {
    return false;
  }

  if (
    typeof result.confidence !== "number" ||
    result.confidence < 0 ||
    result.confidence > 100
  ) {
    return false;
  }

  if (!["intraday", "swing", "long"].includes(result.timeframe)) {
    return false;
  }

  if (!Array.isArray(result.reasons) || result.reasons.length === 0) {
    return false;
  }

  if (!result.reasons.every((reason: any) => typeof reason === "string")) {
    return false;
  }

  return true;
}

function isValidEconomicImpact(result: any): boolean {
  if (!result || typeof result !== "object") {
    return false;
  }

  if (typeof result.impactSummary !== "string") {
    return false;
  }

  const validRisks = ["NONE", "LOW", "MEDIUM", "HIGH", "EXTREME"];
  if (!validRisks.includes(result.immediateRisk)) {
    return false;
  }

  const validOutlooks = ["BULLISH", "BEARISH", "NEUTRAL", "VOLATILE"];
  if (!validOutlooks.includes(result.weeklyOutlook)) {
    return false;
  }

  if (!Array.isArray(result.warnings) || !Array.isArray(result.opportunities)) {
    return false;
  }

  if (typeof result.recommendation !== "string") {
    return false;
  }

  return true;
}
