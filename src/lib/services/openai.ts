import axios from "axios";

export interface AnalysisResult {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  timeframe: "intraday" | "swing" | "long";
  reasons: string[];
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
