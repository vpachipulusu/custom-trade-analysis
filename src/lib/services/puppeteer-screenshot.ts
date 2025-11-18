import puppeteer from "puppeteer";
import { getLogger } from "../logging";

interface PuppeteerScreenshotParams {
  layoutId: string;
  sessionid: string;
  sessionidSign: string;
  width?: number;
  height?: number;
}

export async function captureWithPuppeteer(
  params: PuppeteerScreenshotParams
): Promise<string> {
  const logger = getLogger();

  logger.info("Starting Puppeteer browser automation", {
    layoutId: params.layoutId
  });

  const width = params.width || 1920;
  const height = params.height || 1080;

  let browser;
  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--window-size=${width},${height}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
      defaultViewport: {
        width,
        height,
      },
    });

    // Get browser context and set cookies before creating page
    const context = browser.defaultBrowserContext();

    logger.debug("Setting TradingView cookies", {
      sessionidLength: params.sessionid?.length,
      sessionidSignLength: params.sessionidSign?.length
    });

    // Set cookies at browser context level
    await context.setCookie(
      {
        name: "sessionid",
        value: params.sessionid,
        domain: ".tradingview.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "sessionid_sign",
        value: params.sessionidSign,
        domain: ".tradingview.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }
    );

    const page = await browser.newPage();

    // Verify cookies
    const cookies = await page.cookies();
    logger.debug("Cookies set in browser context", {
      cookieCount: cookies.length,
      cookieNames: cookies.map((c) => c.name).join(", ")
    });

    // Now navigate to the actual chart
    const chartUrl = `https://www.tradingview.com/chart/${params.layoutId}/`;
    logger.info("Navigating to TradingView chart", { chartUrl });

    await page.goto(chartUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    logger.debug("Page loaded", {
      url: page.url(),
      title: await page.title()
    });

    logger.debug("Waiting for chart to load");

    // Wait for the main chart container
    await page.waitForSelector("canvas", { timeout: 60000 });
    logger.debug("Canvas found, waiting for chart to fully render");

    // Wait longer for all indicators, drawings, and data to load
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Additional wait to ensure all network requests for indicators are complete
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
      logger.debug("Network became idle");
    } catch (e) {
      logger.debug("Network not idle, continuing with screenshot");
    }

    // Final wait for any animations to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));

    logger.debug("Taking screenshot");

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    logger.info("Screenshot captured successfully", {
      screenshotLength: screenshot.length
    });

    // Convert buffer to base64 data URL
    const base64 = Buffer.from(screenshot).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return dataUrl;
  } catch (error) {
    logger.error("Puppeteer screenshot failed", {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.layoutId
    });
    throw new Error(
      `Puppeteer screenshot failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
