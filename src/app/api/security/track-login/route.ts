import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";

/**
 * POST /api/security/track-login
 * Track user login for security monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { userAgent, device, browser } = body;

    // Get IP address from request headers
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "Unknown";

    // For now, location is just set to "Unknown"
    // In production, you could use a geolocation API with the IP
    const location = "Unknown";

    // Update user's lastLoginAt
    await prisma.user.update({
      where: { id: authResult.user.userId },
      data: { lastLoginAt: new Date() },
    });

    // Create login history record
    await prisma.loginHistory.create({
      data: {
        userId: authResult.user.userId,
        ipAddress,
        userAgent,
        location,
        device,
        browser,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login tracking error:", error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
