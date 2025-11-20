import axios from "axios";
import { AnalysisResult, EconomicImpactResult } from "./openai";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";
import { getLogger } from "../logging";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_KEY = process.env.CLAUDE_KEY;
// Try the latest model first, fallback to known working model
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620"; // Claude 3.5 Sonnet

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

JSON Format (return ONLY this JSON, no other text):
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
    "entryPrice": <number>,
    "stopLoss": <number>,
    "targetPrice": <number>,
    "riskRewardRatio": <number>,
    "setupDescription": "detailed explanation"
  }
}`;

/**
 * Convert image URL to base64 for Claude API
 */
async function getImageBase64(imageUrl: string): Promise<string> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const base64 = Buffer.from(response.data, "binary").toString("base64");
    return base64;
  } catch (error) {
    throw new Error(`Failed to fetch image: ${error}`);
  }
}

/**
 * Analyzes a TradingView chart using Claude API
 */
export async function analyzeChart(imageUrl: string, modelId?: string): Promise<AnalysisResult> {
  try {
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_KEY environment variable is not set");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const logger = getLogger();
    const model = modelId || CLAUDE_MODEL;

    // Get image as base64
    const imageBase64 = await getImageBase64(imageUrl);

    // Make API request to Claude
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: ANALYSIS_PROMPT,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        timeout: 60000,
      }
    );

    if (!response.data?.content?.[0]?.text) {
      throw new Error("Invalid response from Claude API");
    }

    // Parse the JSON response
    const content = response.data.content[0].text;

    // Extract JSON from response (Claude sometimes wraps it in markdown or text)
    let jsonText = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error("Failed to parse Claude response", {
        content: content.substring(0, 500),
        error: parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI analysis result");
    }

    logger.debug("Claude analysis result", {
      action: analysisResult.action,
      confidence: analysisResult.confidence,
      timeframe: analysisResult.timeframe,
      hasTradeSetup: !!analysisResult.tradeSetup,
    });

    // Validate the response
    if (!validateAnalysisResult(analysisResult)) {
      throw new Error("Invalid analysis result from AI");
    }

    return analysisResult;
  } catch (error) {
    const logger = getLogger();
    logger.error("Claude API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        const errorDetails = error.response.data?.error
          ? JSON.stringify(error.response.data.error)
          : error.response.statusText;
        throw new Error(
          `Claude API error: ${error.response.status} - ${errorDetails}`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to Claude API");
      }
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze chart"
    );
  }
}

/**
 * Analyzes multiple chart layouts using Claude
 */
export async function analyzeMultipleLayouts(
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>,
  modelId?: string
): Promise<AnalysisResult> {
  try {
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_KEY environment variable is not set");
    }

    if (!layouts || layouts.length === 0) {
      throw new Error("At least one layout is required");
    }

    const logger = getLogger();
    const model = modelId || CLAUDE_MODEL;

    logger.info("Starting Claude multi-layout analysis", {
      model,
      layoutCount: layouts.length,
      intervals: layouts.map((l) => l.interval).join(", "),
    });

    // If only one layout, use single chart analysis
    if (layouts.length === 1) {
      return await analyzeChart(layouts[0].imageUrl, modelId);
    }

    const MULTI_LAYOUT_PROMPT = `Analyze ${layouts.length} different TradingView chart layouts showing the SAME financial instrument from different timeframes.

Timeframes: ${layouts.map((l) => l.interval).join(", ")}

Perform a comprehensive multi-timeframe analysis and return ONLY valid JSON in the same format as before.`;

    // Get all images as base64
    const imageContents = await Promise.all(
      layouts.map(async (layout) => {
        const base64 = await getImageBase64(layout.imageUrl);
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/jpeg" as const,
            data: base64,
          },
        };
      })
    );

    // Build content with all images and text
    const content = [
      ...imageContents,
      {
        type: "text" as const,
        text: MULTI_LAYOUT_PROMPT + "\n\n" + ANALYSIS_PROMPT,
      },
    ];

    // Make API request to Claude
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model,
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        timeout: 120000,
      }
    );

    if (!response.data?.content?.[0]?.text) {
      throw new Error("Invalid response from Claude API");
    }

    const responseContent = response.data.content[0].text;

    // Extract JSON from response
    let jsonText = responseContent;
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error("Failed to parse Claude multi-layout response", {
        content: responseContent.substring(0, 500),
        error: parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI multi-layout analysis result");
    }

    logger.info("Claude multi-layout analysis completed", {
      layoutCount: layouts.length,
      action: analysisResult.action,
      confidence: analysisResult.confidence,
    });

    if (!validateAnalysisResult(analysisResult)) {
      throw new Error("Invalid multi-layout analysis result from AI");
    }

    return analysisResult;
  } catch (error) {
    const logger = getLogger();
    logger.error("Claude multi-layout API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze multiple layouts"
    );
  }
}

/**
 * Analyze economic impact using Claude
 */
export async function analyzeEconomicImpact(params: {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  upcomingEvents: EconomicEvent[];
  weeklyEvents: EconomicEvent[];
}): Promise<EconomicImpactResult> {
  try {
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_KEY environment variable is not set");
    }

    const { symbol, action, confidence, upcomingEvents, weeklyEvents } = params;

    if (upcomingEvents.length === 0 && weeklyEvents.length === 0) {
      return {
        impactSummary: `No major economic events scheduled that would impact ${symbol}.`,
        immediateRisk: "NONE",
        weeklyOutlook: "NEUTRAL",
        warnings: [],
        opportunities: ["Clear economic calendar provides stable trading environment"],
        recommendation: `The ${action} signal on ${symbol} (${confidence}% confidence) is not conflicted by upcoming economic events.`,
      };
    }

    const prompt = `Analyze how these economic events will impact a ${action} position on ${symbol} (confidence: ${confidence}%).

IMMEDIATE EVENTS: ${JSON.stringify(upcomingEvents, null, 2)}
WEEKLY EVENTS: ${JSON.stringify(weeklyEvents, null, 2)}

Return ONLY valid JSON:
{
  "impactSummary": "overview",
  "immediateRisk": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
  "weeklyOutlook": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE",
  "warnings": ["warning1", "warning2"],
  "opportunities": ["opportunity1"],
  "recommendation": "recommendation text"
}`;

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        timeout: 60000,
      }
    );

    const content = response.data.content[0]?.text;
    if (!content) {
      throw new Error("No response from Claude");
    }

    // Extract JSON
    let jsonText = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const result: EconomicImpactResult = JSON.parse(jsonText);

    if (!isValidEconomicImpact(result)) {
      throw new Error("Invalid economic impact response format");
    }

    return result;
  } catch (error: any) {
    const logger = getLogger();
    logger.error("Claude economic impact analysis error", {
      error: error.message,
      stack: error.stack,
    });

    const immediateRisk = calculateImmediateRisk(params.upcomingEvents);
    return {
      impactSummary: `Economic event analysis unavailable. ${
        params.upcomingEvents.length + params.weeklyEvents.length
      } events detected.`,
      immediateRisk,
      weeklyOutlook: "NEUTRAL",
      warnings:
        immediateRisk === "HIGH" || immediateRisk === "EXTREME"
          ? ["High-impact economic events detected"]
          : [],
      opportunities: [],
      recommendation: `Review economic calendar manually before executing ${params.action} on ${params.symbol}.`,
    };
  }
}

function validateAnalysisResult(result: any): result is AnalysisResult {
  if (!result || typeof result !== "object") return false;
  if (!["BUY", "SELL", "HOLD"].includes(result.action)) return false;
  if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 100) return false;
  if (!["intraday", "swing", "long"].includes(result.timeframe)) return false;
  if (!Array.isArray(result.reasons) || result.reasons.length === 0) return false;
  if (!result.reasons.every((reason: any) => typeof reason === "string")) return false;
  return true;
}

function isValidEconomicImpact(result: any): boolean {
  if (!result || typeof result !== "object") return false;
  if (typeof result.impactSummary !== "string") return false;
  const validRisks = ["NONE", "LOW", "MEDIUM", "HIGH", "EXTREME"];
  if (!validRisks.includes(result.immediateRisk)) return false;
  const validOutlooks = ["BULLISH", "BEARISH", "NEUTRAL", "VOLATILE"];
  if (!validOutlooks.includes(result.weeklyOutlook)) return false;
  if (!Array.isArray(result.warnings) || !Array.isArray(result.opportunities)) return false;
  if (typeof result.recommendation !== "string") return false;
  return true;
}
