import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";

/**
 * GET /api/settings
 * Get user's settings (notification preferences, security settings)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Get or create user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: authResult.user.userId },
    });

    // If settings don't exist, create with defaults
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: authResult.user.userId,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

/**
 * PUT /api/settings
 * Update user's settings
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();

    // Validate allowed fields
    const allowedFields = [
      "emailNotifications",
      "pushNotifications",
      "marketingEmails",
      "securityAlerts",
      "notificationFrequency",
      "twoFactorEnabled",
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Validate notificationFrequency if provided
    if (updateData.notificationFrequency) {
      const validFrequencies = ["instant", "daily", "weekly"];
      if (!validFrequencies.includes(updateData.notificationFrequency)) {
        return NextResponse.json(
          { error: "Invalid notification frequency" },
          { status: 400 }
        );
      }
    }

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: authResult.user.userId },
      create: {
        userId: authResult.user.userId,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json(settings);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
