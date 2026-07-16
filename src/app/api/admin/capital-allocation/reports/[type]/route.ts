import { NextResponse } from "next/server";
import { poolCapitalAllocationService } from "@/services/pool-capital-allocation.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const csv = await poolCapitalAllocationService.exportReport(type);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ryvonx-capital-${type}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
