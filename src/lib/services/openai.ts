import axios from "axios";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";
import { getLogger } from "../logging";

export interface AnalysisResult {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  timeframe: "intraday" | "swing" | "long";
  reasons: string[];
  tradeSetup?: {
    quality: "A" | "B" | "C";
    entryPrice: number | null;
    stopLoss: number | null;
    targetPrice: number | null;
    riskRewardRatio: number | null;
    setupDescription: string;
  };
}

export interface EconomicImpactResult {
  impactSummary: string;
  immediateRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  weeklyOutlook: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  warnings: string[];
  opportunities: string[];
  recommendation: string;
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_KEY;

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
 * Analyzes a TradingView chart using OpenAI GPT-4o
 */
export async function analyzeChart(imageUrl: string): Promise<AnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: ANALYSIS_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 60000, // 60 second timeout
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    // Parse the JSON response
    const content = response.data.choices[0].message.content;
    const logger = getLogger();
    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse OpenAI response", {
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
    logger.debug("OpenAI analysis result", {
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
    logger.error("OpenAI API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `OpenAI API error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to OpenAI API");
      }
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze chart"
    );
  }
}

/**
 * Analyzes multiple chart timeframes for the same symbol using OpenAI GPT-4o
 * Combines insights from different timeframes (Daily, 4H, 1H, etc.)
 */
export async function analyzeMultiTimeframeCharts(
  chartsData: Array<{ interval: string; imageUrl: string }>
): Promise<AnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
    }

    if (!chartsData || chartsData.length === 0) {
      throw new Error("At least one chart is required");
    }

    const MULTI_TIMEFRAME_PROMPT = `You are an expert technical analyst. Analyze MULTIPLE timeframe charts for the SAME trading symbol.

CRITICAL: You are viewing ${
      chartsData.length
    } different timeframes of the SAME symbol. Perform a comprehensive multi-timeframe analysis.

Timeframes provided:
${chartsData
  .map((c, i) => `${i + 1}. ${c.interval || "Unknown"} timeframe`)
  .join("\n")}

MULTI-TIMEFRAME ANALYSIS REQUIREMENTS:
1. **Higher Timeframe Bias**: Start with the longest timeframe to determine overall trend direction
2. **Lower Timeframe Entry**: Use shorter timeframes for precise entry timing
3. **Confluence**: Look for alignment between timeframes (e.g., Daily downtrend + 4H resistance)
4. **Divergence**: Note if timeframes show conflicting signals
5. **Trade Direction**: Higher timeframe trend should guide the trade direction
6. **Entry Timing**: Lower timeframes provide better entry points

ANALYSIS PRIORITY:
- Daily/Weekly charts → Determine trend direction and major levels
- 4H charts → Identify swing points and intermediate levels
- 1H charts → Fine-tune entry and exit points
- Lower timeframes → Precise timing and confirmation

Return ONLY valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "timeframe": "intraday" | "swing" | "long",
  "reasons": [
    "Higher timeframe (Daily) analysis with trend direction",
    "Medium timeframe (4H) showing key levels and structure",
    "Lower timeframe (1H) entry signal and confirmation",
    "Confluence factors across timeframes",
    "Risk/reward assessment from multi-timeframe perspective",
    "Additional technical factors"
  ],
  "tradeSetup": {
    "quality": "A" | "B" | "C",
    "entryPrice": <ACTUAL number>,
    "stopLoss": <ACTUAL number>,
    "targetPrice": <ACTUAL number>,
    "riskRewardRatio": <calculated ratio>,
    "setupDescription": "Multi-timeframe setup explanation: Higher TF shows [trend/bias], Medium TF at [key level], Lower TF entry at [specific price]. Stop at [level] based on [timeframe], Target at [level] from [timeframe analysis]."
  }
}

PRICE READING RULES (same as single timeframe):
- Read from RIGHT EDGE price scale
- Use proper decimals (4-5 for forex, 2 for gold, etc.)
- Entry and Stop MUST be meaningfully different
- Stop placement based on the most relevant timeframe level

EXAMPLE Multi-TF Analysis:
{
  "action": "SELL",
  "confidence": 88,
  "timeframe": "swing",
  "reasons": [
    "Daily chart in clear downtrend from 1.1700, respecting downtrend channel",
    "4H showing rejection at 1.1613 resistance zone with bearish engulfing pattern",
    "1H forming lower highs at 1.1592, confirming bearish momentum",
    "All timeframes showing RSI below 50, aligned bearish momentum",
    "Daily 200 EMA at 1.1620 providing dynamic resistance confluence",
    "4H and 1H both showing bearish Ichimoku Cloud, confirming short bias"
  ],
  "tradeSetup": {
    "quality": "A",
    "entryPrice": 1.1592,
    "stopLoss": 1.1613,
    "targetPrice": 1.1500,
    "riskRewardRatio": 4.38,
    "setupDescription": "Daily downtrend from 1.1700 provides bearish bias. 4H chart shows strong resistance rejection at 1.1613. Enter short at 1H level of 1.1592 with stop above 4H resistance at 1.1613 (21 pips). Target daily support at 1.1500 (92 pips), giving 4.38:1 RR. Multi-timeframe alignment confirms high-probability setup."
  }
}`;

    // Build message content with all chart images
    const messageContent: any[] = [
      {
        type: "text",
        text: MULTI_TIMEFRAME_PROMPT,
      },
    ];

    // Add all chart images
    chartsData.forEach((chart, index) => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: chart.imageUrl,
        },
      });
    });

    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200, // Slightly more for multi-timeframe analysis
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 90000, // 90 second timeout for multiple images
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    // Parse the JSON response
    const content = response.data.choices[0].message.content;
    const logger = getLogger();
    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse OpenAI multi-timeframe response", {
        content: content.substring(0, 500),
        error:
          parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI multi-timeframe analysis result");
    }

    logger.info("Multi-timeframe analysis completed", {
      timeframes: chartsData.map((c) => c.interval).join(", "),
      action: analysisResult.action,
      confidence: analysisResult.confidence,
    });

    // Validate the response
    if (!validateAnalysisResult(analysisResult)) {
      throw new Error("Invalid multi-timeframe analysis result from AI");
    }

    return analysisResult;
  } catch (error) {
    const logger = getLogger();
    logger.error("OpenAI multi-timeframe API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `OpenAI API error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to OpenAI API");
      }
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze charts"
    );
  }
}

/**
 * Detects and corrects incorrect price magnitudes (e.g., 90.327 -> 90327.00 for BTC)
 */
function correctPriceMagnitude(
  price: number | null,
  logger: any
): number | null {
  if (price === null || price === undefined) return null;

  // Detect if price looks like it's missing magnitude (too small)
  // BTC should be 80,000-100,000, but AI might return 80-100
  // Only correct if price is clearly in the wrong magnitude (less than 1000 but looks like BTC/Gold)
  if (price > 50 && price < 500) {
    // Check if this looks like a divided-by-1000 error
    // E.g., 90.397 should be 90397, 88.000 should be 88000
    const correctedPrice = price * 1000;

    // Only apply correction if the corrected price is in reasonable ranges
    // BTC: 80,000-100,000, Gold: 2,000-3,000
    if ((correctedPrice >= 80000 && correctedPrice <= 100000) ||
        (correctedPrice >= 2000 && correctedPrice <= 3000)) {
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

/**
 * Validates and corrects trade setup prices
 */
function validateAndCorrectTradeSetup(
  tradeSetup: any,
  logger: any
): any {
  if (!tradeSetup) return tradeSetup;

  const corrected = { ...tradeSetup };

  // Log original values for debugging
  logger.debug("Trade setup before correction", {
    entryPrice: tradeSetup.entryPrice,
    stopLoss: tradeSetup.stopLoss,
    targetPrice: tradeSetup.targetPrice,
    riskRewardRatio: tradeSetup.riskRewardRatio,
  });

  // Correct price magnitudes
  if (tradeSetup.entryPrice !== null && tradeSetup.entryPrice !== undefined) {
    corrected.entryPrice = correctPriceMagnitude(tradeSetup.entryPrice, logger);
  }

  if (tradeSetup.stopLoss !== null && tradeSetup.stopLoss !== undefined) {
    corrected.stopLoss = correctPriceMagnitude(tradeSetup.stopLoss, logger);
  }

  if (tradeSetup.targetPrice !== null && tradeSetup.targetPrice !== undefined) {
    corrected.targetPrice = correctPriceMagnitude(tradeSetup.targetPrice, logger);
  }

  // Always recalculate risk-reward ratio if we have all three prices
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
    // Log warning if any values are missing
    logger.warn("Cannot calculate risk-reward ratio - missing prices", {
      hasEntry: corrected.entryPrice !== null && corrected.entryPrice !== undefined,
      hasStop: corrected.stopLoss !== null && corrected.stopLoss !== undefined,
      hasTarget: corrected.targetPrice !== null && corrected.targetPrice !== undefined,
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

/**
 * Validates the analysis result structure
 */
function validateAnalysisResult(result: any): result is AnalysisResult {
  if (!result || typeof result !== "object") {
    return false;
  }

  // Validate action
  if (!["BUY", "SELL", "HOLD"].includes(result.action)) {
    return false;
  }

  // Validate confidence
  if (
    typeof result.confidence !== "number" ||
    result.confidence < 0 ||
    result.confidence > 100
  ) {
    return false;
  }

  // Validate timeframe
  if (!["intraday", "swing", "long"].includes(result.timeframe)) {
    return false;
  }

  // Validate reasons
  if (!Array.isArray(result.reasons) || result.reasons.length === 0) {
    return false;
  }

  if (!result.reasons.every((reason: any) => typeof reason === "string")) {
    return false;
  }

  return true;
}

/**
 * Fallback: Analyze layouts individually when multi-image request is refused
 * Combines individual analyses into a synthesized result
 */
async function analyzeLayoutsIndividually(
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>
): Promise<AnalysisResult> {
  const logger = getLogger();

  logger.info("Analyzing layouts individually", {
    layoutCount: layouts.length,
    intervals: layouts.map((l) => l.interval).join(", "),
  });

  // Analyze each chart individually
  const individualAnalyses = await Promise.all(
    layouts.map(async (layout, index) => {
      try {
        logger.debug(`Analyzing layout ${index + 1}`, {
          interval: layout.interval,
          layoutId: layout.layoutId,
        });
        const result = await analyzeChart(layout.imageUrl);
        return { ...result, interval: layout.interval, success: true };
      } catch (error) {
        logger.error(`Failed to analyze layout ${index + 1}`, {
          interval: layout.interval,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return { success: false, interval: layout.interval };
      }
    })
  );

  // Filter successful analyses
  const successfulAnalyses = individualAnalyses.filter(
    (a): a is AnalysisResult & { interval: string; success: true } =>
      a.success === true
  );

  if (successfulAnalyses.length === 0) {
    throw new Error("All individual chart analyses failed");
  }

  logger.info("Individual analyses completed", {
    total: layouts.length,
    successful: successfulAnalyses.length,
  });

  // Synthesize results: Use most common action, average confidence, combine reasons
  const actionCounts = successfulAnalyses.reduce((acc, a) => {
    acc[a.action] = (acc[a.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const synthesizedAction = Object.entries(actionCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0] as "BUY" | "SELL" | "HOLD";

  const avgConfidence = Math.round(
    successfulAnalyses.reduce((sum, a) => sum + a.confidence, 0) /
      successfulAnalyses.length
  );

  // Determine timeframe from longest interval
  const timeframeMap: Record<string, number> = {
    intraday: 1,
    swing: 2,
    long: 3,
  };
  const synthesizedTimeframe = successfulAnalyses.reduce((longest, a) => {
    return timeframeMap[a.timeframe] > timeframeMap[longest.timeframe]
      ? a
      : longest;
  }).timeframe;

  // Combine reasons with context
  const synthesizedReasons: string[] = [];
  successfulAnalyses.forEach((analysis, index) => {
    synthesizedReasons.push(
      `${analysis.interval} timeframe: ${analysis.action} with ${analysis.confidence}% confidence`
    );
    // Add top 2 reasons from each analysis
    analysis.reasons.slice(0, 2).forEach((reason) => {
      synthesizedReasons.push(`  - ${reason}`);
    });
  });

  // Add confluence note
  if (successfulAnalyses.length > 1) {
    const allAgree = successfulAnalyses.every(
      (a) => a.action === synthesizedAction
    );
    if (allAgree) {
      synthesizedReasons.push(
        `✓ Multi-timeframe confluence: All ${successfulAnalyses.length} timeframes agree on ${synthesizedAction}`
      );
    } else {
      synthesizedReasons.push(
        `⚠ Divergence detected: ${actionCounts[synthesizedAction]} of ${successfulAnalyses.length} timeframes suggest ${synthesizedAction}`
      );
    }
  }

  // Use trade setup from the analysis with highest confidence
  const bestAnalysis = successfulAnalyses.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );

  const synthesizedResult: AnalysisResult = {
    action: synthesizedAction,
    confidence: avgConfidence,
    timeframe: synthesizedTimeframe,
    reasons: synthesizedReasons.slice(0, 10), // Limit to 10 reasons
    tradeSetup: bestAnalysis.tradeSetup
      ? {
          ...bestAnalysis.tradeSetup,
          setupDescription: `Multi-layout analysis (${successfulAnalyses.length} timeframes): ${bestAnalysis.tradeSetup.setupDescription}`,
        }
      : undefined,
  };

  logger.info("Synthesized multi-layout result", {
    action: synthesizedResult.action,
    confidence: synthesizedResult.confidence,
    timeframe: synthesizedResult.timeframe,
    layoutsAnalyzed: successfulAnalyses.length,
  });

  return synthesizedResult;
}

/**
 * Analyze multiple chart layouts for the same symbol
 * Combines insights from different timeframes and perspectives
 */
export async function analyzeMultipleLayouts(
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>
): Promise<AnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
    }

    if (!layouts || layouts.length === 0) {
      throw new Error("At least one layout is required");
    }

    const logger = getLogger();
    logger.info("Starting multi-layout analysis", {
      layoutCount: layouts.length,
      intervals: layouts.map((l) => l.interval).join(", "),
    });

    // If only one layout, use single chart analysis
    if (layouts.length === 1) {
      return await analyzeChart(layouts[0].imageUrl);
    }

    const MULTI_LAYOUT_PROMPT = `You are a professional financial technical analyst providing educational analysis of trading chart layouts. This is for educational and informational purposes to help understand market structure.

TASK: Analyze ${
      layouts.length
    } different TradingView chart layouts showing the SAME financial instrument from different perspectives (timeframes or technical indicators).

CHART LAYOUTS PROVIDED:
${layouts
  .map(
    (l, i) =>
      `Chart ${i + 1}: ${l.interval} timeframe (Layout ID: ${l.layoutId})`
  )
  .join("\n")}

ANALYSIS METHODOLOGY:
1. Study all charts together for a comprehensive technical view
2. Identify confluence (agreement) across different timeframes and layouts
3. Note divergences or conflicts between chart perspectives
4. Higher timeframe trends typically guide longer-term directional bias
5. Lower timeframe charts help refine potential entry timing
6. Synthesize all technical observations into one cohesive educational analysis

TECHNICAL PRICE READING GUIDELINES:
- **CRITICAL - READ THE RIGHT EDGE PRICE SCALE CAREFULLY**: Look at the numbers on the RIGHT side of the chart
- Current market price shown in TOP LEFT ticker information area
- **DO NOT USE ROUNDED OR SIMPLIFIED NUMBERS**: Use the EXACT price magnitude from the chart
  * BTC/BTCUSD: Prices are in TENS OF THOUSANDS range (80,000-100,000+)
    ✓ CORRECT: 92658.50, 90327.00, 88450.75
    ✗ WRONG: 92.658, 90.327, 88.450 (These are NOT Bitcoin prices!)
  * Gold/XAUUSD: Prices are in THOUSANDS range (2000-3000)
    ✓ CORRECT: 2658.75, 2635.00, 2680.50
    ✗ WRONG: 2.658, 2.635, 2.680 (These are NOT Gold prices!)
  * Forex pairs: 0.5-2.0 range with 4-5 decimals (e.g., 1.15920)
  * JPY pairs: 100-160 range with 2-3 decimals (e.g., 149.875)
  * Stocks: Varies by stock (e.g., AAPL 175.50, TSLA 250.00)
- Entry and stop loss must be MEANINGFULLY different
  * For BTC: At least 200-500 points difference (e.g., Entry 90327, Stop 89800)
  * For Gold: At least 10-20 points difference (e.g., Entry 2658.75, Stop 2645.00)
  * For Forex: At least 20-50 pips difference (e.g., Entry 1.0850, Stop 1.0830)

PRICE EXAMPLES BY INSTRUMENT TYPE (READ CAREFULLY):
- BTCUSD at 90327: Entry=90327.00, Stop=89800.00, Target=91500.00
  ✗ NEVER write: Entry=90.327, Stop=88.000, Target=94.000 (WRONG!)
- BTCUSD at 92500: Entry=92500.00, Stop=91800.00, Target=94200.00
  ✗ NEVER write: Entry=92.5, Stop=91.8 (WRONG!)
- EURUSD at 1.0850: Entry=1.08500, Stop=1.08350, Target=1.09200
- XAUUSD at 2650: Entry=2650.00, Stop=2635.00, Target=2680.00
  ✗ NEVER write: Entry=2.650, Stop=2.635 (WRONG!)
- USDJPY at 149.50: Entry=149.500, Stop=149.200, Target=150.200

TECHNICAL ANALYSIS OUTPUT FORMAT (JSON):
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "timeframe": "intraday" | "swing" | "long",
  "reasons": [
    "Chart 1 (${
      layouts[0]?.interval
    }): Technical observation with specific price levels",
    "Chart 2 (${
      layouts[1]?.interval
    }): Technical observation with specific price levels",
    "Multi-chart confluence: Agreements between different perspectives",
    "Higher timeframe trend analysis and key technical levels",
    "Lower timeframe confirmation or rejection signals",
    "Combined technical factors and their significance",
    "Risk assessment from multi-layout perspective"
  ],
  "tradeSetup": {
    "quality": "A" | "B" | "C",
    "entryPrice": <number with appropriate decimals - REQUIRED, never null>,
    "stopLoss": <number with meaningful distance from entry - REQUIRED, never null>,
    "targetPrice": <number based on technical levels - REQUIRED, never null>,
    "riskRewardRatio": <calculated ratio - REQUIRED, never null>,
    "setupDescription": "Educational multi-layout setup explanation: Higher timeframe [trend/bias details], Medium timeframe [key level analysis], Lower timeframe [entry timing]. Stop placement at [technical level] based on [timeframe], Target at [technical level] from [timeframe analysis]. Combined technical view supporting [confidence reasoning]."
  }
}

TECHNICAL STOP LOSS GUIDELINES:
- For SELL setups: Stop loss above entry at resistance or swing high
- For BUY setups: Stop loss below entry at support or swing low
- Use appropriate timeframe's technical level for stop placement
- Ensure meaningful separation between entry and stop prices

CONFIDENCE ASSESSMENT:
- High confidence (80-95%): Strong alignment across all chart layouts
- Medium confidence (60-79%): Most charts agree with minor divergences
- Lower confidence (40-59%): Charts show conflicting technical signals

EXAMPLE for BTCUSD at 90327 (Daily + 4H charts):
{
  "action": "BUY",
  "confidence": 82,
  "timeframe": "swing",
  "reasons": [
    "Daily chart: Bullish falling wedge pattern breaking out, price at 90327.00",
    "4H chart: Price holding above support at 89800.00, showing strength",
    "Daily RSI at 55 showing bullish momentum building",
    "4H chart forming higher lows from 89500 to 90000, confirming uptrend",
    "Volume increasing on moves above 90000 support on both timeframes",
    "Multi-timeframe confluence: Both daily and 4H showing bullish structure"
  ],
  "tradeSetup": {
    "quality": "A",
    "entryPrice": 90327.00,
    "stopLoss": 89800.00,
    "targetPrice": 91500.00,
    "riskRewardRatio": 2.23,
    "setupDescription": "Daily falling wedge breakout provides bullish bias. 4H chart shows support holding at 89800-90000 zone. Enter long at 90327 with stop below 4H swing low at 89800 (527 point risk). Target next resistance at 91500 (1173 point reward), giving 2.23:1 risk-reward. Multi-timeframe alignment confirms high-probability setup."
  }
}

CRITICAL FINAL INSTRUCTIONS:
1. ALL tradeSetup fields (entryPrice, stopLoss, targetPrice, riskRewardRatio) MUST have EXACT numeric values
2. DO NOT ROUND prices to nearest thousand (e.g., don't use 91000 when chart shows 91330)
3. Read the EXACT price from each chart's right-side price scale
4. Use the SAME precise prices in both the JSON fields AND the setupDescription
5. Never use null for these fields - always provide actual numbers based on chart analysis
6. Only omit tradeSetup entirely if charts are completely unreadable

Example of CORRECT precision for BTC:
- If chart shows 91,330: Use "entryPrice": 91330 (NOT 91000)
- If chart shows 89,189: Use "stopLoss": 89189 (NOT 89000)
- If chart shows 95,400: Use "targetPrice": 95400 (NOT 95000)

Provide ONLY valid JSON output. No additional text or formatting.`;

    // Build message content with all chart images
    const messageContent: any[] = [
      {
        type: "text",
        text: MULTI_LAYOUT_PROMPT,
      },
    ];

    // Add all chart images
    layouts.forEach((layout, index) => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: layout.imageUrl,
          detail: "high", // Use high detail for better analysis
        },
      });
    });

    // Make API request to OpenAI
    logger.debug("Making OpenAI API request for multi-layout", {
      layoutCount: layouts.length,
      messageContentLength: messageContent.length,
    });

    let response;
    try {
      response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: messageContent,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500, // More tokens for multi-layout analysis
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          timeout: 120000, // 2 minute timeout for multiple images
        }
      );
    } catch (axiosError) {
      logger.error("OpenAI API request failed", {
        error:
          axiosError instanceof Error ? axiosError.message : "Unknown error",
        isAxiosError: axios.isAxiosError(axiosError),
        responseStatus: axios.isAxiosError(axiosError)
          ? axiosError.response?.status
          : undefined,
        responseData: axios.isAxiosError(axiosError)
          ? JSON.stringify(axiosError.response?.data).substring(0, 500)
          : undefined,
      });
      throw axiosError;
    }

    logger.debug("OpenAI API response received for multi-layout", {
      hasData: !!response.data,
      hasChoices: !!response.data?.choices,
      choicesLength: response.data?.choices?.length,
      hasMessage: !!response.data?.choices?.[0]?.message,
      hasContent: !!response.data?.choices?.[0]?.message?.content,
      hasRefusal: !!response.data?.choices?.[0]?.message?.refusal,
      refusal: response.data?.choices?.[0]?.message?.refusal,
      responseKeys: response.data ? Object.keys(response.data) : [],
    });

    // Check for refusal first
    if (response.data?.choices?.[0]?.message?.refusal) {
      logger.warn(
        "OpenAI refused multi-layout request, falling back to individual analysis",
        {
          refusal: response.data.choices[0].message.refusal,
          layoutCount: layouts.length,
        }
      );

      // Fallback: Analyze each chart individually and combine results
      return await analyzeLayoutsIndividually(layouts);
    }

    if (!response.data?.choices?.[0]?.message?.content) {
      logger.error("Invalid OpenAI multi-layout response structure", {
        responseData: JSON.stringify(response.data).substring(0, 1000),
      });
      throw new Error("Invalid response from OpenAI API");
    }

    // Parse the JSON response
    const content = response.data.choices[0].message.content;
    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      logger.error("Failed to parse OpenAI multi-layout response", {
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

    logger.info("Multi-layout analysis completed", {
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
    logger.error("OpenAI multi-layout API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `OpenAI API error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to OpenAI API");
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
 * Analyze economic impact on trading decision
 */
export async function analyzeEconomicImpact(params: {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  upcomingEvents: EconomicEvent[];
  weeklyEvents: EconomicEvent[];
}): Promise<EconomicImpactResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
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
      OPENAI_API_URL,
      {
        model: "gpt-4o",
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
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result: EconomicImpactResult = JSON.parse(content);

    // Validate result
    if (!isValidEconomicImpact(result)) {
      throw new Error("Invalid economic impact response format");
    }

    return result;
  } catch (error: any) {
    const logger = getLogger();
    logger.error("Error analyzing economic impact", {
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
 * Validate economic impact result structure
 */
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
