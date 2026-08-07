import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { id } = await params;
    const campaign = await poolManagerGrowthService.getContentById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaign";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { id } = await params;
    const body = await request.json();
    const result = await poolManagerGrowthService.reviewContent({
      contentId: id,
      approve: Boolean(body.approve),
      reviewNotes: body.reviewNotes,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
