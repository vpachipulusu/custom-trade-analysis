import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/lib/logging";

interface UserSettings {
  defaultAiModel?: string;
  sessionid?: string;
  sessionidSign?: string;
}

// GET /api/user/settings
export async function GET(req: NextRequest) {
  const logger = getLogger();

  try {
    const user = await authenticateRequest(req);

    // Get user settings from database
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        defaultAiModel: true,
        sessionid: true,
        sessionidSign: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settings: UserSettings = {
      defaultAiModel: userRecord.defaultAiModel || "gpt-4o",
      sessionid: userRecord.sessionid || "",
      sessionidSign: userRecord.sessionidSign || "",
    };

    return NextResponse.json(settings);
  } catch (error) {
    logger.error("Failed to fetch user settings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST /api/user/settings
export async function POST(req: NextRequest) {
  const logger = getLogger();

  try {
    const user = await authenticateRequest(req);

    const body = await req.json();
    const { defaultAiModel, sessionid, sessionidSign } = body;

    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        defaultAiModel,
        sessionid,
        sessionidSign,
      },
      select: {
        defaultAiModel: true,
        sessionid: true,
        sessionidSign: true,
      },
    });

    logger.info("User settings updated", {
      userId: user.userId,
      defaultAiModel,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    logger.error("Failed to update user settings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
