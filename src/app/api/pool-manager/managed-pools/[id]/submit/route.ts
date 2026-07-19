import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await managedPoolService.submitForReview(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Submit failed");
  }
}
