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
    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width, height },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    // Decrypt session credentials
    // TradingView cookies are already plain text - no need to decrypt
    const sessionId = params.sessionid;
    const sessionIdSign = params.sessionidSign;

    console.log("Playwright: Setting TradingView cookies");
    console.log("Playwright: sessionid length:", sessionId?.length);
    console.log("Playwright: sessionid_sign length:", sessionIdSign?.length);

    // Add TradingView cookies for authentication
    await context.addCookies([
      {
        name: "sessionid",
        value: sessionId,
        domain: ".tradingview.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
      {
        name: "sessionid_sign",
        value: sessionIdSign,
        domain: ".tradingview.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
    ]);

    const page = await context.newPage();

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

    // Wait a bit for chart to start rendering
    await page.waitForTimeout(5000);

    console.log("Playwright: Waiting for chart to load");

    // Wait for the chart canvas to be visible with increased timeout
    // TradingView charts can take time to fully load
    await page.waitForSelector("canvas", { timeout: 60000 });

    // Give extra time for drawings/indicators to render
    await page.waitForTimeout(5000);

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
