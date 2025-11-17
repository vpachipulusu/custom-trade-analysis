import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/automation/[id]
 * Delete an automation schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;

    // Verify schedule belongs to user
    const schedule = await prisma.automationSchedule.findFirst({
      where: {
        id,
        userId: authResult.user.userId,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    await prisma.automationSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
