import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reviewNote?: string };
    await managedPoolService.rejectSubmission(id, body.reviewNote);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reject failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
