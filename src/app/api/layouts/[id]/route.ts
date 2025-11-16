import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, verifyOwnership } from "@/lib/utils/apiAuth";
import { getLayoutById, updateLayout, deleteLayout } from "@/lib/db/layouts";
import { validateLayoutData } from "@/lib/utils/validation";
import { encrypt } from "@/lib/utils/encryption";
import { createErrorResponse } from "@/lib/utils/errorHandler";

/**
 * PATCH /api/layouts/[id]
 * Update a layout
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

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

    // Validate layout data
    const validation = validateLayoutData(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    // Encrypt sessionid if provided
    let encryptedSessionId = body.sessionid;
    if (body.sessionid && body.sessionid !== layout.sessionid) {
      try {
        encryptedSessionId = encrypt(body.sessionid);
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to encrypt session data" },
          { status: 500 }
        );
      }
    }

    // Update layout
    const updatedLayout = await updateLayout(id, {
      layoutId: body.layoutId !== undefined ? body.layoutId : layout.layoutId,
      symbol: body.symbol !== undefined ? body.symbol : layout.symbol,
      interval: body.interval !== undefined ? body.interval : layout.interval,
      sessionid:
        encryptedSessionId !== undefined
          ? encryptedSessionId
          : layout.sessionid,
      sessionidSign:
        body.sessionidSign !== undefined
          ? body.sessionidSign
          : layout.sessionidSign,
    });

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
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return authResult.error;
    }

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

    return NextResponse.json(
      { message: "Layout deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
