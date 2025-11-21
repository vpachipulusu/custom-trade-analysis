import axios from "axios";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";
import { getLogger } from "../logging";
import { ANALYSIS_PROMPT, buildMultiLayoutPrompt, buildMultiTimeframePrompt } from "./prompts";

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

/**
 * Analyzes a TradingView chart using OpenAI GPT-4o
 */
export async function analyzeChart(imageUrl: string, modelId?: string): Promise<AnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const model = modelId || "gpt-4o";

    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model,
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
  chartsData: Array<{ interval: string; imageUrl: string }>,
  modelId?: string
): Promise<AnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
    }

    if (!chartsData || chartsData.length === 0) {
      throw new Error("At least one chart is required");
    }

    const model = modelId || "gpt-4o";

    // Use centralized multi-timeframe prompt
    const MULTI_TIMEFRAME_PROMPT = buildMultiTimeframePrompt(chartsData);

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
        model,
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
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>,
  modelId?: string
): Promise<AnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_KEY environment variable is not set");
    }

    if (!layouts || layouts.length === 0) {
      throw new Error("At least one layout is required");
    }

    const logger = getLogger();
    const model = modelId || "gpt-4o";

    logger.info("Starting multi-layout analysis", {
      model,
      layoutCount: layouts.length,
      intervals: layouts.map((l) => l.interval).join(", "),
    });

    // If only one layout, use single chart analysis
    if (layouts.length === 1) {
      return await analyzeChart(layouts[0].imageUrl, modelId);
    }

    // Use centralized multi-layout prompt
    const MULTI_LAYOUT_PROMPT = buildMultiLayoutPrompt(layouts);

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
          model,
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
