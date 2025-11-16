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

    // Prepare request body - CHART-IMG API expects specific format
    const body: Record<string, any> = {};

    // Add chart parameters
    // Priority: Use layoutId to get user's saved chart with drawings and indicators
    if (params.layoutId) {
      // Use layoutId for saved layouts - this captures the user's exact chart setup
      body.layout = params.layoutId;
      console.log(
        `Using layoutId=${params.layoutId} to capture user's chart with drawings`
      );

      // TradingView session authentication is REQUIRED for private layouts
      if (!params.sessionid || !params.sessionidSign) {
        console.warn(
          "WARNING: layoutId provided without TradingView sessionid - API may return default chart instead of user's layout"
        );
      }
    } else if (params.symbol && params.interval) {
      // Fallback: Use symbol and interval for basic chart (no drawings)
      // Format symbol: TradingView requires EXCHANGE:SYMBOL format (e.g., "FX:EURUSD", "NASDAQ:AAPL")
      let formattedSymbol = params.symbol;
      if (!formattedSymbol.includes(":")) {
        // Auto-add exchange prefix for common forex pairs
        if (/^[A-Z]{6}$/.test(formattedSymbol)) {
          // 6-letter forex pair like EURUSD
          formattedSymbol = `FX:${formattedSymbol}`;
        } else {
          // For other symbols, default to FX or warn
          console.warn(
            `Symbol ${formattedSymbol} doesn't include exchange. Adding FX: prefix. For stocks, use format like NASDAQ:AAPL`
          );
          formattedSymbol = `FX:${formattedSymbol}`;
        }
      }

      // Format interval: TradingView uses formats like "1", "5", "15", "60", "1D", "1W", "1M"
      // Convert minutes to appropriate format
      let formattedInterval = params.interval;
      const intervalNum = parseInt(params.interval);
      if (!isNaN(intervalNum)) {
        if (intervalNum >= 1440) {
          // Daily or longer
          const days = intervalNum / 1440;
          if (days === 1) formattedInterval = "1D";
          else if (days === 7) formattedInterval = "1W";
          else if (days >= 30) formattedInterval = "1M";
        } else if (intervalNum >= 60) {
          // Hourly
          const hours = intervalNum / 60;
          if ([1, 2, 3, 4, 6, 8, 12].includes(hours)) {
            formattedInterval = `${hours}h`;
          }
        }
        // For minutes < 60, keep as-is (1, 5, 15, 30, 45)
      }

      body.symbol = formattedSymbol;
      body.interval = formattedInterval;
      console.log(
        `Using symbol=${formattedSymbol} and interval=${formattedInterval} for basic chart (no drawings)`
      );
    } else {
      throw new Error(
        "Either layoutId OR both symbol and interval must be provided"
      );
    }

    // Add width and height - respecting API limits
    // BASIC plan max: 800x600, PRO plan allows higher resolutions
    body.width = 800;
    body.height = 600;

    // Log request details for debugging
    console.log("CHART-IMG API Request:", {
      url: CHARTIMG_API_URL,
      body: body,
      hasApiKey: !!CHARTIMG_API_KEY,
      hasSessionId: !!params.sessionid,
    });

    // Make API request - response type is arraybuffer for binary image data
    const response = await axios.post(CHARTIMG_API_URL, body, {
      headers,
      timeout: 30000, // 30 second timeout
      responseType: "arraybuffer", // Get binary data
    });

    console.log("CHART-IMG API Response Status:", response.status);
    console.log("CHART-IMG API Response Type:", typeof response.data);
    console.log("CHART-IMG API Response Length:", response.data?.length || 0);
    console.log("CHART-IMG API Response Headers:", response.headers);

    // CHART-IMG API returns the actual PNG image data, not a URL
    // We need to convert this to a base64 data URL
    if (!response.data || response.data.length === 0) {
      throw new Error("CHART-IMG API returned empty response");
    }

    // Convert buffer to base64 data URL
    const base64Image = Buffer.from(response.data).toString("base64");
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log(
      "Successfully converted image to data URL, length:",
      imageUrl.length
    );

    // Calculate expiration date (CHART-IMG hosted images typically expire in 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    console.log("Snapshot generated successfully:", imageUrl);

    return {
      url: imageUrl,
      expiresAt,
    };
  } catch (error) {
    console.error("CHART-IMG API Full Error:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Log full response for debugging
        console.error("CHART-IMG Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });

        // Decode error message from buffer if needed
        let errorData = error.response.data;
        if (Buffer.isBuffer(errorData)) {
          try {
            const decoded = errorData.toString("utf-8");
            console.error("Decoded error message:", decoded);
            errorData = JSON.parse(decoded);
          } catch (e) {
            console.error("Failed to decode error buffer:", e);
          }
        }

        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          (Array.isArray(errorData) && errorData.length > 0
            ? JSON.stringify(errorData)
            : null) ||
          error.response.statusText ||
          "Unknown error";

        throw new Error(
          `CHART-IMG API error (${error.response.status}): ${errorMessage}`
        );
      } else if (error.request) {
        console.error("No response received from CHART-IMG API");
        throw new Error(
          "Failed to connect to CHART-IMG API. Please check your internet connection and API endpoint."
        );
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Failed to generate chart snapshot");
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
