import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";
import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await managedPoolService.getForManager(id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Pool not found");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ManagedPoolFormInput;
    await managedPoolService.updateDraft(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Update failed");
  }
}
