import axios from "axios";
import { EconomicEvent, calculateImmediateRisk } from "./economicCalendar";

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

CRITICAL: You MUST read the ACTUAL numerical price values visible on the chart. Look at:
1. The price scale on the RIGHT EDGE of the chart (vertical axis with numbers)
2. The current price displayed in the TOP LEFT corner (usually shows the ticker and current price)
3. Any price levels drawn as horizontal lines on the chart

DO NOT make up or approximate prices. If BTC is trading at 92,658.44, your entry should be near 92,658, NOT 92.00 or 100.00.

JSON Format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "timeframe": "intraday" | "swing" | "long",
  "reasons": ["reason 1 with specific price levels", "reason 2 with indicators", "reason 3 with trend"],
  "tradeSetup": {
    "quality": "A" | "B" | "C",
    "entryPrice": <ACTUAL number from chart or null>,
    "stopLoss": <ACTUAL number from chart or null>,
    "targetPrice": <ACTUAL number from chart or null>,
    "riskRewardRatio": <calculated number or null>,
    "setupDescription": "detailed explanation with ACTUAL price levels"
  }
}

PRICE READING RULES:
- BTC/BTCUSD: Prices are typically 90,000 - 100,000 range (e.g., 92,658.44)
- ETH/ETHUSD: Prices are typically 2,000 - 4,000 range
- XAUUSD (Gold): Prices are typically 2,600 - 2,700 range
- Forex pairs: Usually 1.0000 - 2.0000 range
- Read the EXACT numbers from the price scale on the right side

TRADE SETUP QUALITY:
- A Setup: Perfect confluence, clear trend, 3:1+ R:R, strong support/resistance
- B Setup: Good signals, 2:1+ R:R, acceptable entry
- C Setup: Marginal, <2:1 R:R, mixed signals

PRICE CALCULATIONS:
- entryPrice: Current price OR better entry at nearby support/resistance (READ FROM CHART)
- stopLoss: Recent swing high/low OR support/resistance level (READ FROM CHART)  
- targetPrice: Next resistance/support level (READ FROM CHART)
- riskRewardRatio: (targetPrice - entryPrice) / (entryPrice - stopLoss) for SELL reverse the formula

EXAMPLE for BTCUSD at 92,658:
{
  "action": "SELL",
  "confidence": 75,
  "timeframe": "swing",
  "reasons": ["Price below Ichimoku Cloud at 94,500", "Resistance at 100,000 held", "Downtrend from 104,000"],
  "tradeSetup": {
    "quality": "A",
    "entryPrice": 92600,
    "stopLoss": 100000,
    "targetPrice": 80000,
    "riskRewardRatio": 1.70,
    "setupDescription": "Enter short at current 92,600 level with stop at 100,000 resistance (7,400 risk). Target 80,000 support level (12,600 reward) for 1.7:1 R:R."
  }
}

If prices unreadable, set tradeSetup values to null.`;

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
