import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await managedPoolService.approveAndGoLive(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
