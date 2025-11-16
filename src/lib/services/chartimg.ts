import axios from "axios";

export interface GenerateSnapshotParams {
  symbol?: string;
  interval?: string;
  layoutId?: string;
  sessionid?: string;
  sessionidSign?: string;
}

export interface GenerateSnapshotResult {
  url: string;
  expiresAt: Date;
}

const CHARTIMG_API_URL =
  "https://api.chart-img.com/v2/tradingview/advanced-chart";
const CHARTIMG_API_KEY = process.env.CHART_IMG_KEY;

/**
 * Generates a TradingView chart snapshot using CHART-IMG API
 */
export async function generateSnapshot(
  params: GenerateSnapshotParams
): Promise<GenerateSnapshotResult> {
  try {
    if (!CHARTIMG_API_KEY) {
      throw new Error("CHART_IMG_KEY environment variable is not set");
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "x-api-key": CHARTIMG_API_KEY,
      "Content-Type": "application/json",
    };

    // Add sessionid headers if provided
    if (params.sessionid && params.sessionidSign) {
      headers["tv-sessionid"] = params.sessionid;
      headers["tv-sessionid_sign"] = params.sessionidSign;
    }

    // Prepare request body
    const body: Record<string, any> = {
      storage: true, // Have CHART-IMG host the image
    };

    // Add chart parameters
    if (params.layoutId) {
      body.layoutId = params.layoutId;
    } else if (params.symbol && params.interval) {
      body.symbol = params.symbol;
      body.interval = params.interval;
    } else {
      throw new Error(
        "Either layoutId OR both symbol and interval must be provided"
      );
    }

    // Make API request
    const response = await axios.post(CHARTIMG_API_URL, body, {
      headers,
      timeout: 30000, // 30 second timeout
    });

    if (!response.data || !response.data.url) {
      throw new Error("Invalid response from CHART-IMG API");
    }

    // Calculate expiration date (typically 30 days for CHART-IMG hosted images)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return {
      url: response.data.url,
      expiresAt,
    };
  } catch (error) {
    console.error("CHART-IMG API error:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `CHART-IMG API error: ${error.response.status} - ${
            error.response.data?.error || error.response.statusText
          }`
        );
      } else if (error.request) {
        throw new Error("Failed to connect to CHART-IMG API");
      }
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to generate chart snapshot"
    );
  }
}

/**
 * Validates snapshot parameters
 */
export function validateSnapshotParams(params: GenerateSnapshotParams): void {
  if (!params.layoutId && (!params.symbol || !params.interval)) {
    throw new Error(
      "Either layoutId OR both symbol and interval must be provided"
    );
  }

  if (params.sessionid && !params.sessionidSign) {
    throw new Error("sessionidSign is required when sessionid is provided");
  }

  if (!params.sessionid && params.sessionidSign) {
    throw new Error("sessionid is required when sessionidSign is provided");
  }
}
