import axios from "axios";
import { AnalysisResult, EconomicImpactResult } from "./openai";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";
import { getLogger } from "../logging";

// Use Gemini 1.5 Pro for vision analysis
// Note: Use v1 API for Gemini 1.5 models, v1beta only supports older models
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || "v1";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_API_KEY = process.env.GEMINI_KEY;

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
 * Convert image URL to base64 for Gemini API
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
 * Analyzes a TradingView chart using Google Gemini Pro Vision
 */
export async function analyzeChart(imageUrl: string, modelId?: string): Promise<AnalysisResult> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_KEY environment variable is not set");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const logger = getLogger();
    const model = modelId || GEMINI_MODEL;
    const apiUrl = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent`;

    // Get image as base64
    const imageBase64 = await getImageBase64(imageUrl);

    // Make API request to Gemini
    const response = await axios.post(
      `${apiUrl}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from Gemini API");
    }

    // Parse the JSON response
    const content = response.data.candidates[0].content.parts[0].text;

    // Extract JSON from response (Gemini sometimes wraps it in markdown)
    let jsonText = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error("Failed to parse Gemini response", {
        content: content.substring(0, 500),
        error: parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI analysis result");
    }

    logger.debug("Gemini analysis result", {
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
    logger.error("Gemini API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `Gemini API error: ${error.response.status} - ${
            error.response.data?.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to Gemini API");
      }
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze chart"
    );
  }
}

/**
 * Analyzes multiple chart layouts using Gemini Pro Vision
 */
export async function analyzeMultipleLayouts(
  layouts: Array<{ interval: string; imageUrl: string; layoutId: string }>,
  modelId?: string
): Promise<AnalysisResult> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_KEY environment variable is not set");
    }

    if (!layouts || layouts.length === 0) {
      throw new Error("At least one layout is required");
    }

    const logger = getLogger();
    const model = modelId || GEMINI_MODEL;
    const apiUrl = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent`;

    logger.info("Starting Gemini multi-layout analysis", {
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
    const imageParts = await Promise.all(
      layouts.map(async (layout) => {
        const base64 = await getImageBase64(layout.imageUrl);
        return {
          inline_data: {
            mime_type: "image/jpeg",
            data: base64,
          },
        };
      })
    );

    // Build content with text and all images
    const parts = [{ text: MULTI_LAYOUT_PROMPT + "\n\n" + ANALYSIS_PROMPT }, ...imageParts];

    // Make API request to Gemini
    const response = await axios.post(
      `${apiUrl}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from Gemini API");
    }

    const content = response.data.candidates[0].content.parts[0].text;

    // Extract JSON from response
    let jsonText = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error("Failed to parse Gemini multi-layout response", {
        content: content.substring(0, 500),
        error: parseError instanceof Error ? parseError.message : "Unknown error",
      });
      throw new Error("Failed to parse AI multi-layout analysis result");
    }

    logger.info("Gemini multi-layout analysis completed", {
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
    logger.error("Gemini multi-layout API error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error(
      error instanceof Error ? error.message : "Failed to analyze multiple layouts"
    );
  }
}

/**
 * Analyze economic impact using Gemini
 */
export async function analyzeEconomicImpact(params: {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  upcomingEvents: EconomicEvent[];
  weeklyEvents: EconomicEvent[];
}): Promise<EconomicImpactResult> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_KEY environment variable is not set");
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
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    const content = response.data.candidates[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("No response from Gemini");
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
    logger.error("Gemini economic impact analysis error", {
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
      warnings: immediateRisk === "HIGH" || immediateRisk === "EXTREME"
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
