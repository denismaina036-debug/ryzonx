import { NextResponse } from "next/server";
import { poolAdminService } from "@/services/pool-admin.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fund = await poolAdminService.updateMarketplaceSettings(id, body);
    return NextResponse.json(fund);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
