import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getLayoutById, updateLayout, deleteLayout, countLayoutsBySymbol } from "@/lib/db/layouts";
import { validateLayoutData } from "@/lib/utils/validation";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";
import { getMaxLayoutsPerSymbol } from "@/lib/utils/config";

/**
 * PATCH /api/layouts/[id]
 * Update a layout
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for logging
    LogContext.set({ userId: authResult.user.userId });

    const { id } = params;

    // Get layout and verify ownership
    const layout = await getLayoutById(id);
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    if (!verifyOwnership(authResult.user.userId, layout.userId)) {
      return NextResponse.json(
        { error: "You do not have permission to update this layout" },
        { status: 403 }
      );
    }

    const body = await request.json();

    logger.debug("Update layout request", {
      layoutId: id,
      bodyKeys: Object.keys(body)
    });

    // Validate layout data
    const validation = validateLayoutData(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    // Check if symbol is being changed and validate the limit for the new symbol
    if (body.symbol !== undefined && body.symbol !== layout.symbol) {
      const newSymbol = body.symbol || null;

      // Only check limit if changing to a non-null symbol
      if (newSymbol) {
        const maxLayoutsPerSymbol = getMaxLayoutsPerSymbol();
        const existingLayoutsCount = await countLayoutsBySymbol(
          authResult.user.userId,
          newSymbol
        );

        if (existingLayoutsCount >= maxLayoutsPerSymbol) {
          return NextResponse.json(
            {
              error: `Maximum of ${maxLayoutsPerSymbol} layouts per symbol reached. The symbol ${newSymbol} already has ${existingLayoutsCount} layouts.`
            },
            { status: 400 }
          );
        }
      }
    }

    // Prepare update data - allow clearing fields with null/empty string
    const updateData: any = {};

    // layoutId - allow null to clear
    if (body.layoutId !== undefined) {
      updateData.layoutId = body.layoutId || null;
    }

    // symbol - allow null to clear
    if (body.symbol !== undefined) {
      updateData.symbol = body.symbol || null;
    }

    // interval - allow null to clear
    if (body.interval !== undefined) {
      updateData.interval = body.interval || null;
    }

    logger.debug("Updating layout in database", {
      layoutId: id,
      updateKeys: Object.keys(updateData)
    });

    // Update layout
    const updatedLayout = await updateLayout(id, updateData);

    logger.info("Layout updated successfully", { layoutId: id });

    return NextResponse.json(updatedLayout);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

/**
 * DELETE /api/layouts/[id]
 * Delete a layout (cascades to snapshots and analyses)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = getLogger();

  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Set user context for logging
    LogContext.set({ userId: authResult.user.userId });

    const { id } = params;

    // Get layout and verify ownership
    const layout = await getLayoutById(id);
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    if (!verifyOwnership(authResult.user.userId, layout.userId)) {
      return NextResponse.json(
        { error: "You do not have permission to delete this layout" },
        { status: 403 }
      );
    }

    // Delete layout (cascades to snapshots and analyses)
    await deleteLayout(id);

    logger.info("Layout deleted successfully", { layoutId: id });

    return NextResponse.json(
      { message: "Layout deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error deleting layout", {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id
    });
    return createErrorResponse(error, 500);
  }
}
