import { NextResponse } from "next/server";
import { managedPoolService } from "@/services/managed-pool.service";
import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const pools = await managedPoolService.listMine();
    return NextResponse.json({ pools });
  } catch (error) {
    return errorResponse(error, "Failed to load pools");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ManagedPoolFormInput & { submitForReview?: boolean };
    const { submitForReview, ...form } = body;
    const pool = await managedPoolService.createDraft(form);
    if (submitForReview) {
      await managedPoolService.submitForReview(pool.id);
    }
    return NextResponse.json({ pool });
  } catch (error) {
    return errorResponse(error, "Failed to create pool");
  }
}
