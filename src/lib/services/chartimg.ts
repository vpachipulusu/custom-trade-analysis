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

    // Log request details for debugging
    console.log("CHART-IMG API Request Body:", JSON.stringify(body, null, 2));
    console.log("CHART-IMG API Headers:", {
      "x-api-key": CHARTIMG_API_KEY ? "***SET***" : "***NOT SET***",
      "tv-sessionid": params.sessionid ? "***SET***" : "***NOT SET***",
      "tv-sessionid_sign": params.sessionidSign ? "***SET***" : "***NOT SET***",
    });

    // Make API request
    const response = await axios.post(CHARTIMG_API_URL, body, {
      headers,
      timeout: 30000, // 30 second timeout
    });

    // Log the full response for debugging
    console.log(
      "CHART-IMG API Response:",
      JSON.stringify(response.data, null, 2)
    );

    // Handle different response formats
    let imageUrl: string | undefined;

    // Try different possible response field names
    if (response.data.url) {
      imageUrl = response.data.url;
    } else if (response.data.image) {
      imageUrl = response.data.image;
    } else if (response.data.imageUrl) {
      imageUrl = response.data.imageUrl;
    } else if (response.data.data?.url) {
      imageUrl = response.data.data.url;
    } else if (
      typeof response.data === "string" &&
      response.data.startsWith("http")
    ) {
      imageUrl = response.data;
    }

    if (!imageUrl) {
      console.error("Invalid CHART-IMG response structure:", response.data);
      throw new Error(
        `Invalid response from CHART-IMG API: ${JSON.stringify(response.data)}`
      );
    }

    // Calculate expiration date (typically 30 days for CHART-IMG hosted images)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return {
      url: imageUrl,
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
