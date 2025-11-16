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
    
    console.log("Update layout request body:", JSON.stringify(body, null, 2));

    // Validate layout data
    const validation = validateLayoutData(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    // Encrypt sessionid if provided (and it's a new value, not empty)
    let encryptedSessionId = undefined;
    if (body.sessionid) {
      // User provided a new sessionid value - encrypt it
      console.log("Encrypting new sessionid");
      try {
        encryptedSessionId = encrypt(body.sessionid);
      } catch (error) {
        console.error("Encryption error:", error);
        return NextResponse.json(
          { error: "Failed to encrypt session data" },
          { status: 500 }
        );
      }
    } else if (body.sessionid === null || body.sessionid === "") {
      // User explicitly wants to clear the sessionid
      console.log("Clearing sessionid");
      encryptedSessionId = null;
    } else {
      // sessionid not provided in update - keep existing value
      console.log("Keeping existing sessionid");
      encryptedSessionId = layout.sessionid;
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

    // sessionid - use encrypted value determined above
    updateData.sessionid = encryptedSessionId;

    // sessionidSign - allow null to clear
    if (body.sessionidSign !== undefined) {
      updateData.sessionidSign = body.sessionidSign || null;
    } else {
      // Keep existing value
      updateData.sessionidSign = layout.sessionidSign;
    }

    console.log("Update data being sent to database:", {
      ...updateData,
      sessionid: updateData.sessionid ? "[encrypted]" : updateData.sessionid,
    });

    // Update layout
    const updatedLayout = await updateLayout(id, updateData);
    
    console.log("Layout updated successfully");

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
