import { NextResponse } from "next/server";
import { poolEcosystemService } from "@/services/pool-ecosystem.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [pool, roi] = await Promise.all([
      poolEcosystemService.getPoolById(id),
      poolEcosystemService.getPoolRoi(id),
    ]);
    return NextResponse.json({ pool, roi });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
