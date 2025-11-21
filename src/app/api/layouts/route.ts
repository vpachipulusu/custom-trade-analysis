import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/apiAuth";
import { createLayout, getLayoutsByUserId, countLayoutsBySymbol } from "@/lib/db/layouts";
import { validateLayoutData } from "@/lib/utils/validation";
import { encrypt } from "@/lib/utils/encryption";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getMaxLayoutsPerSymbol } from "@/lib/utils/config";

/**
 * GET /api/layouts
 * Get all layouts for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const layouts = await getLayoutsByUserId(authResult.user.userId);

    // Add snapshot count to each layout
    const layoutsWithCount = layouts.map((layout) => ({
      ...layout,
      snapshotCount: layout.snapshots?.length || 0,
      snapshots: undefined, // Remove full snapshots array
    }));

    return NextResponse.json(layoutsWithCount);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

/**
 * POST /api/layouts
 * Create a new layout
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();

    // Validate layout data
    const validation = validateLayoutData(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    // Check if user has reached the maximum number of layouts for this symbol
    if (body.symbol) {
      const maxLayoutsPerSymbol = getMaxLayoutsPerSymbol();
      const existingLayoutsCount = await countLayoutsBySymbol(
        authResult.user.userId,
        body.symbol
      );

      if (existingLayoutsCount >= maxLayoutsPerSymbol) {
        return NextResponse.json(
          {
            error: `Maximum of ${maxLayoutsPerSymbol} layouts per symbol reached. Please delete an existing layout for ${body.symbol} before adding a new one.`
          },
          { status: 400 }
        );
      }
    }

    // Create layout
    const layout = await createLayout(authResult.user.userId, {
      layoutId: body.layoutId || null,
      symbol: body.symbol || null,
      interval: body.interval || null,
    });

    return NextResponse.json(layout, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
