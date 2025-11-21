import { NextResponse } from "next/server";
import { getMaxLayoutsPerSymbol, getMaxSnapshotsPerLayout } from "@/lib/utils/config";

/**
 * GET /api/config
 * Get public application configuration
 */
export async function GET() {
  return NextResponse.json({
    maxLayoutsPerSymbol: getMaxLayoutsPerSymbol(),
    maxSnapshotsPerLayout: getMaxSnapshotsPerLayout(),
  });
}
