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

CRITICAL PRICE READING INSTRUCTIONS:
1. Look at the price scale on the RIGHT EDGE of the chart - these are the ACTUAL prices
2. Read the current price from the TOP LEFT corner (ticker info area)
3. Identify support/resistance levels from horizontal lines drawn on the chart
4. Use 4-5 decimal places for forex pairs (e.g., 1.1592, not 1.16)
5. Entry and Stop Loss MUST be different prices with meaningful distance
6. Stop Loss should be at least 20-50 pips away from entry for forex

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
    "entryPrice": <ACTUAL number with proper decimals>,
    "stopLoss": <ACTUAL number meaningfully different from entry>,
    "targetPrice": <ACTUAL number from chart>,
    "riskRewardRatio": <calculated ratio>,
    "setupDescription": "detailed multi-sentence explanation with specific prices and risk management"
  }
}

IMPORTANT ANALYSIS REQUIREMENTS:
- Provide 5-7 specific reasons, each mentioning actual price levels or indicator readings
- Each reason should be detailed and reference visible chart elements
- Include trend analysis, support/resistance, indicators, and patterns
- Mention specific price levels visible on the chart

PRICE PRECISION BY INSTRUMENT:
- Forex pairs (EUR/USD, GBP/USD): Use 4-5 decimals (e.g., 1.15920, NOT 1.16)
- JPY pairs (USD/JPY): Use 2-3 decimals (e.g., 149.875)
- BTC/BTCUSD: Use whole numbers or 2 decimals (e.g., 92658.00)
- Gold/XAUUSD: Use 2 decimals (e.g., 2658.50)
- Read EXACT values from the right side price scale

STOP LOSS PLACEMENT RULES:
- For SELL: Stop Loss MUST be ABOVE entry (at resistance or swing high)
- For BUY: Stop Loss MUST be BELOW entry (at support or swing low)
- Minimum distance: 0.0020 for forex pairs (20 pips), 200+ for BTC, 10+ for Gold
- Never place entry and stop at the same price level
- Stop should be at a logical technical level (support/resistance, swing point)

TRADE SETUP REQUIREMENTS:
- entryPrice: Current market price with full precision (e.g., 1.1592 for EUR/USD)
- stopLoss: Swing high/low or S/R level with proper distance from entry
- targetPrice: Next major S/R level or measured move target
- riskRewardRatio: Must be calculated correctly - (target-entry)/(entry-stop) for SELL
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

If chart is unreadable or prices unclear, set tradeSetup values to null.`;

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

    // Log the trade setup for debugging
    console.log("[OpenAI] Analysis result:", JSON.stringify(analysisResult, null, 2));
    
    // Validate and warn about trade setup issues
    if (analysisResult.tradeSetup) {
      const { entryPrice, stopLoss } = analysisResult.tradeSetup;
      
      if (entryPrice !== null && stopLoss !== null) {
        const priceDiff = Math.abs(entryPrice - stopLoss);
        const priceAvg = (entryPrice + stopLoss) / 2;
        const percentDiff = (priceDiff / priceAvg) * 100;
        
        console.log(`[OpenAI] Trade Setup - Entry: ${entryPrice}, Stop: ${stopLoss}, Diff: ${priceDiff.toFixed(5)} (${percentDiff.toFixed(2)}%)`);
        
        // Warn if entry and stop are too close (less than 0.1% difference)
        if (percentDiff < 0.1) {
          console.warn("[OpenAI] WARNING: Entry and Stop Loss are nearly identical!");
        }
      }
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
