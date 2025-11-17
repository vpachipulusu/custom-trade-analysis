import puppeteer from "puppeteer";

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
  console.log(
    "Puppeteer: Starting browser automation for layoutId:",
    params.layoutId
  );

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

    const page = await browser.newPage();

    // First navigate to TradingView to establish context
    console.log("Puppeteer: Navigating to TradingView homepage first");
    await page.goto("https://www.tradingview.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Set cookies after initial navigation
    console.log("Puppeteer: Setting TradingView cookies");
    console.log("Puppeteer: sessionid length:", params.sessionid?.length);
    console.log(
      "Puppeteer: sessionid_sign length:",
      params.sessionidSign?.length
    );

    await page.setCookie(
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

    // Verify cookies
    const cookies = await page.cookies();
    console.log("Puppeteer: Cookies set:", cookies.length);
    console.log(
      "Puppeteer: Cookie names:",
      cookies.map((c) => c.name).join(", ")
    );

    // Now navigate to the actual chart
    const chartUrl = `https://www.tradingview.com/chart/${params.layoutId}/`;
    console.log("Puppeteer: Navigating to chart:", chartUrl);

    await page.goto(chartUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log("Puppeteer: Page loaded, URL:", page.url());
    console.log("Puppeteer: Page title:", await page.title());

    console.log("Puppeteer: Waiting for chart to load");

    // Wait for the main chart container
    await page.waitForSelector("canvas", { timeout: 60000 });
    console.log("Puppeteer: Canvas found, waiting for chart to fully render");

    // Wait longer for all indicators, drawings, and data to load
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Additional wait to ensure all network requests for indicators are complete
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
      console.log("Puppeteer: Network became idle");
    } catch (e) {
      console.log(
        "Puppeteer: Network not idle, but continuing with screenshot"
      );
    }

    // Final wait for any animations to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("Puppeteer: Taking screenshot");

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    console.log(
      "Puppeteer: Screenshot captured successfully, length:",
      screenshot.length
    );

    // Convert buffer to base64 data URL
    const base64 = Buffer.from(screenshot).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return dataUrl;
  } catch (error) {
    console.error("Puppeteer error:", error);
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
