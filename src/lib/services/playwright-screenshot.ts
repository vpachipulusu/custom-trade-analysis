import { chromium } from "playwright";

interface PlaywrightScreenshotParams {
  layoutId: string;
  sessionid: string;
  sessionidSign: string;
  width?: number;
  height?: number;
}

export async function captureWithPlaywright(
  params: PlaywrightScreenshotParams
): Promise<string> {
  console.log(
    "Playwright: Starting browser automation for layoutId:",
    params.layoutId
  );

  const width = params.width || 1920;
  const height = params.height || 1080;

  let browser;
  try {
    // Launch browser in non-headless mode for debugging
    browser = await chromium.launch({
      headless: true, // Set to false to see what's happening
      args: ["--start-maximized"],
    });

    const context = await browser.newContext({
      viewport: { width, height },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      // Accept all cookies and permissions
      permissions: ["geolocation", "notifications"],
      locale: "en-US",
    });

    // Decrypt session credentials
    // TradingView cookies are already plain text - no need to decrypt
    const sessionId = params.sessionid;
    const sessionIdSign = params.sessionidSign;

    console.log("Playwright: Setting TradingView cookies");
    console.log("Playwright: sessionid length:", sessionId?.length);
    console.log("Playwright: sessionid_sign length:", sessionIdSign?.length);
    console.log(
      "Playwright: sessionid value (first 20 chars):",
      sessionId?.substring(0, 20)
    );

    // First navigate to TradingView homepage to establish the session
    const page = await context.newPage();
    console.log("Playwright: Navigating to TradingView homepage first");
    await page.goto("https://www.tradingview.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Now set the authentication cookies
    await context.addCookies([
      {
        name: "sessionid",
        value: sessionId,
        domain: ".tradingview.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "sessionid_sign",
        value: sessionIdSign,
        domain: ".tradingview.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);

    // Verify cookies were set
    const cookies = await context.cookies();
    console.log("Playwright: Cookies set:", cookies.length);
    console.log(
      "Playwright: Cookie names:",
      cookies.map((c) => c.name).join(", ")
    );

    // Navigate to TradingView chart with layoutId
    // Use the direct chart URL format: https://www.tradingview.com/chart/{layoutId}/
    const chartUrl = `https://www.tradingview.com/chart/${params.layoutId}/`;
    console.log("Playwright: Navigating to:", chartUrl);

    // Use 'domcontentloaded' instead of 'networkidle' for faster, more reliable loading
    await page.goto(chartUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log("Playwright: Page loaded, URL:", page.url());
    console.log("Playwright: Page title:", await page.title());

    console.log("Playwright: Waiting for chart to load");

    // Wait for the main chart container
    await page.waitForSelector("canvas", { timeout: 60000 });
    console.log("Playwright: Canvas found, waiting for chart to fully render");

    // Wait longer for all indicators, drawings, and data to load
    // TradingView charts with many indicators can take significant time
    await page.waitForTimeout(15000);

    // Additional wait to ensure all network requests for indicators are complete
    try {
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (e) {
      // Continue even if network doesn't become idle - some charts have continuous updates
      console.log(
        "Playwright: Network not idle, but continuing with screenshot"
      );
    }

    // Final wait for any animations to complete
    await page.waitForTimeout(3000);

    console.log("Playwright: Taking screenshot");

    // Take screenshot of the entire page
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    // Convert to base64 data URL
    const base64Image = screenshot.toString("base64");
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log(
      "Playwright: Screenshot captured successfully, length:",
      dataUrl.length
    );

    await browser.close();

    return dataUrl;
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    console.error("Playwright error:", error);
    throw new Error(
      `Playwright screenshot failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
