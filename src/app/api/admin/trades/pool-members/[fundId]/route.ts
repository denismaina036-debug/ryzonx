import { NextResponse } from "next/server";
import { tradeAdminService } from "@/services/trade-admin.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    const members = await tradeAdminService.getPoolMembers(fundId);
    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pool members.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
