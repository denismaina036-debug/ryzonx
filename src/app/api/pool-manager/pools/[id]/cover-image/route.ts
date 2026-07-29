import { NextResponse } from "next/server";
import { poolImageService } from "@/services/pool-image.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await poolImageService.clearPoolCoverForManager(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Remove failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
