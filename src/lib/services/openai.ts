import axios from "axios";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";

export interface AnalysisResult {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  timeframe: "intraday" | "swing" | "long";
  reasons: string[];
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

const ANALYSIS_PROMPT = `You are an expert technical analyst. Analyze the TradingView chart image and return ONLY valid JSON:

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "timeframe": "intraday" | "swing" | "long",
  "reasons": ["reason 1 with specific indicators", "reason 2 with price levels", "reason 3 with trend"]
}

BUY: bullish signals, uptrend. SELL: bearish signals, downtrend. HOLD: mixed/unclear.
Provide 3-5 specific reasons. If chart unreadable, return confidence 0 and HOLD.`;

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
    let analysisResult: AnalysisResult;

    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Failed to parse AI analysis result");
    }

    // Validate the response
    if (!validateAnalysisResult(analysisResult)) {
      throw new Error("Invalid analysis result from AI");
    }

    return analysisResult;
  } catch (error) {
    console.error("OpenAI API error:", error);

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
    console.error("[OpenAI] Error analyzing economic impact:", error.message);

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
