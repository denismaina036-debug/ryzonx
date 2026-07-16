import { NextResponse } from "next/server";
import { poolCapitalAllocationService } from "@/services/pool-capital-allocation.service";

export async function GET() {
  try {
    const data = await poolCapitalAllocationService.getDashboard();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
