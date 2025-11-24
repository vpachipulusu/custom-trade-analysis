import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getSnapshotById } from "@/lib/db/snapshots";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";
import { performanceLogger } from "@/lib/logging/middleware/performanceLogger";
import { logExternalAPI, logUserAction } from "@/lib/logging/helpers";
import { getLayoutsBySymbol } from "@/lib/db/layouts";
import { captureWithPuppeteer } from "@/lib/services/puppeteer-screenshot";
import { decrypt } from "@/lib/utils/encryption";
import { getUserById } from "@/lib/db/users";
import prisma from "@/lib/prisma";
import {
  executeCompleteAnalysis,
  executeCompleteMultiLayoutAnalysis,
  parseAIModel,
} from "@/lib/services/analysisService";

/**
 * POST /api/analyze
 * Analyze a snapshot using AI, or analyze all layouts for a symbol
 */
export async function POST(request: NextRequest) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for all logs in this request
    LogContext.set({
      userId: authResult.user.userId,
      userEmail: authResult.user.email,
    });

    logger.info("Analysis request started", { userId: authResult.user.userId });

    const body = await request.json();
    const { snapshotId, symbol, aiModel, isAutomated = false, captureNewSnapshots = false } = body;

    // Parse AI model selection using shared service
    const modelConfig = parseAIModel(aiModel);

    // Two modes: single snapshot analysis OR symbol-based multi-layout analysis
    if (!snapshotId && !symbol) {
      logger.warn("Analysis request missing both snapshotId and symbol", {
        userId: authResult.user.userId,
      });
      return NextResponse.json(
        { error: "Either snapshotId or symbol is required" },
        { status: 400 }
      );
    }

    // Mode 1: Analyze multiple layouts for a symbol
    if (symbol) {
      try {
        logger.info("Symbol-based multi-layout analysis requested", {
          symbol,
          userId: authResult.user.userId,
        });

        logUserAction(authResult.user.userId, "analyze_symbol", { symbol });

        // Get all layouts for this symbol
        const layouts = await getLayoutsBySymbol(
          authResult.user.userId,
          symbol
        );

        if (!layouts || layouts.length === 0) {
          logger.warn("No layouts found for symbol", {
            symbol,
            userId: authResult.user.userId,
          });
          return NextResponse.json(
            { error: `No layouts found for symbol ${symbol}` },
            { status: 404 }
          );
        }

        logger.info("Found layouts for symbol", {
          symbol,
          layoutCount: layouts.length,
          intervals: layouts.map((l) => l.interval).join(", "),
          captureNewSnapshots,
        });

        let layoutsWithSnapshots: Array<{
          layoutId: string;
          interval: string;
          imageUrl: string;
          snapshotId: string;
        }> = [];

        // Capture new snapshots if requested
        if (captureNewSnapshots) {
          logger.info("Capturing new snapshots for all layouts", {
            symbol,
            layoutCount: layouts.length,
          });

          // Get user's session credentials
          const user = await getUserById(authResult.user.userId);
          if (!user || !user.sessionid) {
            return NextResponse.json(
              { error: "User session credentials not found. Please configure in Dashboard Settings." },
              { status: 400 }
            );
          }

          // Decrypt session credentials
          let decryptedSessionId = user.sessionid;
          let decryptedSessionidSign = user.sessionidSign;
          try {
            if (user.sessionid.includes(":")) {
              decryptedSessionId = decrypt(user.sessionid);
              if (user.sessionidSign) {
                decryptedSessionidSign = decrypt(user.sessionidSign);
              }
            }
          } catch (error) {
            logger.error("Failed to decrypt session credentials", {
              error: error instanceof Error ? error.message : String(error),
            });
            return NextResponse.json(
              { error: "Failed to decrypt session credentials" },
              { status: 500 }
            );
          }

          // Capture snapshots for all layouts
          for (const layout of layouts) {
            try {
              if (!layout.layoutId) {
                logger.warn("Layout missing layoutId, skipping", {
                  layoutDbId: layout.id,
                  symbol,
                });
                continue;
              }

              logger.info("Capturing snapshot for layout", {
                layoutId: layout.layoutId,
                interval: layout.interval,
                symbol,
              });

              // Capture screenshot with Puppeteer
              const imagePath = await captureWithPuppeteer({
                layoutId: layout.layoutId,
                sessionid: decryptedSessionId,
                sessionidSign: decryptedSessionidSign!,
              });

              // Calculate expiration (24 hours from now)
              const expiresAt = new Date();
              expiresAt.setHours(expiresAt.getHours() + 24);

              // Create snapshot record with imageData
              const snapshot = await prisma.snapshot.create({
                data: {
                  layoutId: layout.id,
                  url: `https://www.tradingview.com/chart/${layout.layoutId}/`,
                  imageData: imagePath,
                  expiresAt,
                },
              });

              layoutsWithSnapshots.push({
                layoutId: layout.id,
                interval: layout.interval || "Unknown",
                imageUrl: imagePath,
                snapshotId: snapshot.id,
              });

              logger.info("Snapshot captured successfully", {
                snapshotId: snapshot.id,
                layoutId: layout.layoutId,
                interval: layout.interval,
              });
            } catch (error) {
              logger.error("Failed to capture snapshot for layout", {
                layoutId: layout.layoutId,
                error: error instanceof Error ? error.message : String(error),
              });
              // Continue with other layouts even if one fails
            }
          }

          if (layoutsWithSnapshots.length === 0) {
            return NextResponse.json(
              { error: "Failed to capture any snapshots. Please check your TradingView session credentials." },
              { status: 500 }
            );
          }
        } else {
          // Use existing snapshots
          logger.debug("Processing layouts for existing snapshots", {
            symbol,
            layoutsCount: layouts.length,
          });

          layoutsWithSnapshots = (layouts as any[])
            .filter((layout) => layout.snapshots && layout.snapshots.length > 0)
            .map((layout) => ({
              layoutId: layout.id,
              interval: layout.interval || "Unknown",
              imageUrl: layout.snapshots[0].url,
              snapshotId: layout.snapshots[0].id,
            }));

          logger.debug("Filtered layouts with snapshots", {
            symbol,
            layoutsWithSnapshotsCount: layoutsWithSnapshots.length,
            snapshots: layoutsWithSnapshots.map((l) => ({
              interval: l.interval,
              hasImageUrl: !!l.imageUrl,
            })),
          });

          if (layoutsWithSnapshots.length === 0) {
            logger.warn("No snapshots found for any layout of symbol", {
              symbol,
              userId: authResult.user.userId,
            });
            return NextResponse.json(
              {
                error: `No snapshots found for layouts of ${symbol}. Please generate snapshots first or use captureNewSnapshots option.`,
              },
              { status: 404 }
            );
          }
        }

        logger.info("Analyzing multiple layouts", {
          symbol,
          layoutCount: layoutsWithSnapshots.length,
          intervals: layoutsWithSnapshots.map((l) => l.interval).join(", "),
        });

        // Use shared service for multi-layout analysis
        const { analysis, economicContext } = await performanceLogger.measure(
          "ai_multi_layout_analysis",
          async () => {
            const startTime = Date.now();
            const result = await executeCompleteMultiLayoutAnalysis({
              userId: authResult.user.userId,
              layouts: layoutsWithSnapshots,
              symbol,
              aiModel,
              isAutomated,
            });
            const duration = Date.now() - startTime;

            logExternalAPI(
              modelConfig.provider.toUpperCase(),
              "/multi-layout-analysis",
              "POST",
              200,
              duration
            );

            return result;
          },
          { symbol, layoutCount: layoutsWithSnapshots.length, aiModel: modelConfig.modelName }
        );

        logger.info("Multi-layout analysis completed", {
          symbol,
          layoutCount: layoutsWithSnapshots.length,
          action: analysis.action,
          confidence: analysis.confidence,
        });

        return NextResponse.json(
          {
            ...analysis,
            economicContext,
          },
          { status: 201 }
        );
      } catch (symbolAnalysisError) {
        logger.error("Symbol-based analysis failed", {
          error:
            symbolAnalysisError instanceof Error
              ? symbolAnalysisError.message
              : "Unknown error",
          stack:
            symbolAnalysisError instanceof Error
              ? symbolAnalysisError.stack
              : undefined,
          symbol,
        });
        return createErrorResponse(symbolAnalysisError, 500);
      }
    }

    // Mode 2: Single snapshot analysis (original behavior)
    if (!snapshotId) {
      logger.warn("Analysis request missing snapshotId", {
        userId: authResult.user.userId,
      });
      return NextResponse.json(
        { error: "snapshotId is required" },
        { status: 400 }
      );
    }

    // Log user action
    logUserAction(authResult.user.userId, "analyze_chart", { snapshotId });

    // Get snapshot and verify ownership
    const snapshot = await getSnapshotById(snapshotId);
    if (!snapshot) {
      logger.warn("Snapshot not found", {
        snapshotId,
        userId: authResult.user.userId,
      });
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    // Cast to any to work around Prisma type limitations
    const snapshotWithLayout = snapshot as any;

    if (
      !snapshotWithLayout.layout?.user ||
      !verifyOwnership(
        authResult.user.userId,
        snapshotWithLayout.layout.user.id
      )
    ) {
      logger.warn("Unauthorized snapshot access attempt", {
        snapshotId,
        userId: authResult.user.userId,
        ownerId: snapshotWithLayout.layout?.user?.id,
      });
      return NextResponse.json(
        { error: "You do not have permission to analyze this snapshot" },
        { status: 403 }
      );
    }

    // Use shared service for single chart analysis with performance tracking
    const { analysis, economicContext } = await performanceLogger.measure(
      "ai_chart_analysis",
      async () => {
        const startTime = Date.now();
        const result = await executeCompleteAnalysis({
          userId: authResult.user.userId,
          snapshotId,
          imageUrl: snapshot.url,
          symbol: snapshotWithLayout.layout?.symbol,
          aiModel,
          isAutomated,
        });
        const duration = Date.now() - startTime;

        logExternalAPI(
          modelConfig.provider.toUpperCase(),
          "/chart-analysis",
          "POST",
          200,
          duration
        );

        return result;
      },
      { snapshotId, aiModel: modelConfig.modelName }
    );

    logger.info("Analysis completed successfully", {
      snapshotId,
      action: analysis.action,
      confidence: analysis.confidence,
      hasEconomicContext: !!economicContext,
    });

    // Return analysis with economic context
    return NextResponse.json(
      {
        ...analysis,
        economicContext,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    logger.error("Analysis failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific OpenAI errors
    if (error instanceof Error && error.message.includes("OpenAI")) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 } // Bad Gateway
      );
    }

    return createErrorResponse(error, 500);
  }
}
