import { NextResponse } from "next/server";
import { poolAdminService } from "@/services/pool-admin.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { userId: string };
    if (!body.userId) {
      return NextResponse.json({ error: "Investor required." }, { status: 400 });
    }
    await poolAdminService.inviteInvestor(id, body.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
