import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getLayoutById, updateLayout, deleteLayout } from "@/lib/db/layouts";
import { validateLayoutData } from "@/lib/utils/validation";
import { createErrorResponse } from "@/lib/utils/errorHandler";
import { getLogger, LogContext } from "@/lib/logging";

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

    // Store sessionid as plain text (no encryption needed)
    let sessionIdValue = undefined;
    if (body.sessionid) {
      // User provided a new sessionid value - store it as-is
      logger.debug("Storing new sessionid", { layoutId: id });
      sessionIdValue = body.sessionid;
    } else if (body.sessionid === null || body.sessionid === "") {
      // User explicitly wants to clear the sessionid
      logger.debug("Clearing sessionid", { layoutId: id });
      sessionIdValue = null;
    } else {
      // sessionid not provided in update - keep existing value
      logger.debug("Keeping existing sessionid", { layoutId: id });
      sessionIdValue = layout.sessionid;
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

    // sessionid - use plain text value determined above
    updateData.sessionid = sessionIdValue;

    // sessionidSign - allow null to clear
    if (body.sessionidSign !== undefined) {
      updateData.sessionidSign = body.sessionidSign || null;
    } else {
      // Keep existing value
      updateData.sessionidSign = layout.sessionidSign;
    }

    logger.debug("Updating layout in database", {
      layoutId: id,
      updateKeys: Object.keys(updateData),
      hasSessionId: !!updateData.sessionid
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
