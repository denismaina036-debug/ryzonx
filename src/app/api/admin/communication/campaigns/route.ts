import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

const STATUS_MAP: Record<string, string> = {
  pending: "submitted",
  approved: "approved",
  published: "published",
  rejected: "rejected",
};

export async function GET(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("status") ?? "pending";
    const status = STATUS_MAP[tab] ?? "submitted";
    const campaigns = await poolManagerGrowthService.listContentByStatus(status);
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
