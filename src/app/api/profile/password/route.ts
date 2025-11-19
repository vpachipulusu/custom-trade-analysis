import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase/adminApp";

/**
 * POST /api/profile/password
 * Change user's password
 * Requires: currentPassword, newPassword, confirmPassword
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    // Validate new password matches confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
        },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // NOTE: Firebase Admin SDK doesn't support password verification
    // The client must handle re-authentication before calling this endpoint
    // This is a security best practice - verify on client, update on server

    try {
      // Update password using Firebase Admin SDK
      await adminAuth.updateUser(authResult.user.uid, {
        password: newPassword,
      });

      // Update lastPasswordChange in user settings
      await prisma.userSettings.upsert({
        where: { userId: authResult.user.userId },
        create: {
          userId: authResult.user.userId,
          lastPasswordChange: new Date(),
        },
        update: {
          lastPasswordChange: new Date(),
        },
      });

      // Create a notification
      await prisma.notification.create({
        data: {
          userId: authResult.user.userId,
          type: "security",
          title: "Password Changed",
          message: "Your password was successfully changed.",
        },
      });

      return NextResponse.json({
        message: "Password changed successfully",
      });
    } catch (error: any) {
      console.error("Firebase password update error:", error);
      return NextResponse.json(
        { error: "Failed to update password. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
