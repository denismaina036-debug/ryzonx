import { NextResponse } from "next/server";
import { investmentAllocationService } from "@/services/investment-allocation.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const allocations = await investmentAllocationService.listMine();
    return NextResponse.json({ allocations });
  } catch (error) {
    return errorResponse(error, "Failed to load allocations");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Parameters<
      typeof investmentAllocationService.create
    >[0];
    const allocation = await investmentAllocationService.create(body);
    return NextResponse.json({ allocation });
  } catch (error) {
    return errorResponse(error, "Failed to create allocation");
  }
}
