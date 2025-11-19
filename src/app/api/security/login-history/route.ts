import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";

/**
 * GET /api/security/login-history
 * Get user's recent login history (last 20 logins)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId: authResult.user.userId },
      orderBy: { loginAt: "desc" },
      take: Math.min(limit, 100), // Max 100 records
    });

    return NextResponse.json(loginHistory);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
