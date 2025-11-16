import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getSnapshotById } from "@/lib/db/snapshots";
import {
  createAnalysis,
  getAnalysisBySnapshotId,
  updateAnalysis,
} from "@/lib/db/analyses";
import { analyzeChart } from "@/lib/services/openai";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * POST /api/analyze
 * Analyze a snapshot using AI
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { snapshotId } = body;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "snapshotId is required" },
        { status: 400 }
      );
    }

    // Get snapshot and verify ownership
    const snapshot = await getSnapshotById(snapshotId);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    if (
      !snapshot.layout?.user ||
      !verifyOwnership(authResult.user.userId, snapshot.layout.user.id)
    ) {
      return NextResponse.json(
        { error: "You do not have permission to analyze this snapshot" },
        { status: 403 }
      );
    }

    // Check if analysis already exists
    const existingAnalysis = await getAnalysisBySnapshotId(snapshotId);

    // Analyze chart using OpenAI
    const analysisResult = await analyzeChart(snapshot.url);

    let analysis;
    if (existingAnalysis) {
      // Update existing analysis
      analysis = await updateAnalysis(existingAnalysis.id, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
      });
    } else {
      // Create new analysis
      analysis = await createAnalysis(authResult.user.userId, snapshotId, {
        action: analysisResult.action,
        confidence: analysisResult.confidence,
        timeframe: analysisResult.timeframe,
        reasons: analysisResult.reasons,
      });
    }

    return NextResponse.json(analysis, {
      status: existingAnalysis ? 200 : 201,
    });
  } catch (error) {
    console.error("Analysis error:", error);

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
