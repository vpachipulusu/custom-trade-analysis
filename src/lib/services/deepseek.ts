import axios from "axios";
import { AnalysisResult, EconomicImpactResult } from "./openai";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";
import { getLogger } from "../logging";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_KEY;

// Same analysis prompt as OpenAI for consistency
const ANALYSIS_PROMPT = `You are an expert technical analyst and professional trader. Analyze the TradingView chart image and return ONLY valid JSON.

CRITICAL PRICE READING INSTRUCTIONS:
1. **READ THE RIGHT EDGE PRICE SCALE CAREFULLY** - Look at the actual numbers on the RIGHT side
2. Read the current price from the TOP LEFT corner (ticker info area)
3. **USE THE CORRECT PRICE MAGNITUDE** based on the instrument:
   - BTC/BTCUSD: TENS OF THOUSANDS (e.g., 90327.00 NOT 90.327)
   - Gold/XAUUSD: THOUSANDS (e.g., 2658.75 NOT 2.658)
   - Forex pairs: Use 4-5 decimals (e.g., 1.15920)
4. Identify support/resistance levels from horizontal lines drawn on the chart
5. Entry and Stop Loss MUST be different prices with meaningful distance
6. Minimum distances:
   - BTC: 200-500 points (e.g., Entry 90327, Stop 89800)
   - Gold: 10-20 points (e.g., Entry 2658.75, Stop 2645.00)
   - Forex: 20-50 pips (e.g., Entry 1.0850, Stop 1.0830)

JSON Format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "timeframe": "intraday" | "swing" | "long",
  "reasons": [
    "Specific technical indicator with exact price level",
    "Trend analysis with direction and key levels",
    "Support/Resistance level identification",
    "Pattern recognition (if visible)",
    "Volume or momentum indicator reading",
    "Additional confluence factor"
  ],
  "tradeSetup": {
    "quality": "A" | "B" | "C",
    "entryPrice": <ACTUAL number with proper decimals - REQUIRED, never null>,
    "stopLoss": <ACTUAL number meaningfully different from entry - REQUIRED, never null>,
    "targetPrice": <ACTUAL number from chart - REQUIRED, never null>,
    "riskRewardRatio": <calculated ratio - REQUIRED, never null>,
    "setupDescription": "detailed multi-sentence explanation with specific prices and risk management"
  }
}

IMPORTANT ANALYSIS REQUIREMENTS:
- Provide 5-7 specific reasons, each mentioning actual price levels or indicator readings
- Each reason should be detailed and reference visible chart elements
- Include trend analysis, support/resistance, indicators, and patterns
- Mention specific price levels visible on the chart

PRICE PRECISION BY INSTRUMENT (CRITICAL - NO ROUNDING):
- BTC/BTCUSD: TENS OF THOUSANDS range (80,000-100,000+)
  ✓ CORRECT: 90327.00, 91330.00, 92658.50, 88450.75, 95000.00
  ✗ WRONG: 90.327, 92.658, 88.450 (THESE ARE NOT BITCOIN PRICES!)
  ✗ WRONG: 91000 (ROUNDED - should be 91330)
  ✗ WRONG: 89000 (ROUNDED - should be 89189 or exact value from chart)
- Gold/XAUUSD: THOUSANDS range (2,000-3,000)
  ✓ CORRECT: 2658.50, 2635.00, 2680.75
  ✗ WRONG: 2.658, 2.635, 2.680 (THESE ARE NOT GOLD PRICES!)
  ✗ WRONG: 2660 (ROUNDED - use exact value like 2658.50)
- Forex pairs (EUR/USD, GBP/USD): Use 4-5 decimals (e.g., 1.15920, NOT 1.16)
- JPY pairs (USD/JPY): Use 2-3 decimals (e.g., 149.875)
- Read EXACT values from the right side price scale - DO NOT ROUND TO NEAREST THOUSAND

STOP LOSS PLACEMENT RULES:
- For SELL: Stop Loss MUST be ABOVE entry (at resistance or swing high)
- For BUY: Stop Loss MUST be BELOW entry (at support or swing low)
- Minimum distance: 0.0020 for forex pairs (20 pips), 200+ for BTC, 10+ for Gold
- Never place entry and stop at the same price level
- Stop should be at a logical technical level (support/resistance, swing point)

TRADE SETUP REQUIREMENTS (ALL FIELDS REQUIRED - NO NULL VALUES, NO ROUNDING):
- entryPrice: EXACT current market price with full precision - REQUIRED, DO NOT ROUND
  * For BTC at 91,330: Use 91330.00 NOT 91000
  * For BTC at 89,189: Use 89189.00 NOT 89000
- stopLoss: EXACT swing high/low or S/R level - REQUIRED, DO NOT ROUND
- targetPrice: EXACT next major S/R level or measured move target - REQUIRED, DO NOT ROUND
- riskRewardRatio: Must be calculated correctly - (target-entry)/(entry-stop) for SELL - REQUIRED
- setupDescription: Multi-sentence explanation covering:
  * Why enter at this specific price
  * Where stop is placed and why (swing level, S/R)
  * Target selection reasoning
  * Risk/reward calculation with actual pip/point values
  * Additional confluence factors

EXAMPLE for EUR/USD at 1.1592:
{
  "action": "SELL",
  "confidence": 85,
  "timeframe": "swing",
  "reasons": [
    "Price trading below Ichimoku Cloud at 1.1600, indicating bearish momentum",
    "Strong resistance zone at 1.1613 rejected price multiple times",
    "Downtrend channel from 1.1700 high remains intact",
    "RSI showing bearish divergence at 1.1613 resistance",
    "Price made lower highs and lower lows, confirming downtrend structure",
    "200 EMA at 1.1620 acting as dynamic resistance"
  ],
  "tradeSetup": {
    "quality": "A",
    "entryPrice": 1.1592,
    "stopLoss": 1.1613,
    "targetPrice": 1.1500,
    "riskRewardRatio": 4.38,
    "setupDescription": "Enter short at current 1.1592 level as price shows rejection at resistance. Place stop loss at 1.1613 above the recent swing high and resistance zone (21 pip risk). Target the 1.1500 psychological support level and previous swing low (92 pip reward), giving us a 4.38:1 risk-reward ratio. The setup shows strong bearish confluence with Ichimoku Cloud, resistance rejection, and intact downtrend."
  }
}

CRITICAL FINAL INSTRUCTIONS:
1. ALL tradeSetup fields (entryPrice, stopLoss, targetPrice, riskRewardRatio) must have EXACT numeric values
2. DO NOT ROUND prices to nearest thousand (e.g., don't use 91000 when chart shows 91330)
3. Read the EXACT price from the chart's right-side price scale
4. Use the SAME precise prices in both the JSON fields AND the setupDescription
5. Only set tradeSetup to null/undefined if the chart is completely unreadable

Example of CORRECT precision:
- If chart shows 91,330: Use "entryPrice": 91330 (NOT 91000)
- If chart shows 89,189: Use "stopLoss": 89189 (NOT 89000)
- If chart shows 95,400: Use "targetPrice": 95400 (NOT 95000)`;

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
