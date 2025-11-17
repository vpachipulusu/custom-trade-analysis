import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { triggerSchedulerNow } from "@/lib/jobs/scheduler";

/**
 * POST /api/automation/trigger
 * Manually trigger automation jobs (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Trigger scheduler manually
    await triggerSchedulerNow();

    return NextResponse.json({
      success: true,
      message: "Automation jobs triggered successfully",
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
