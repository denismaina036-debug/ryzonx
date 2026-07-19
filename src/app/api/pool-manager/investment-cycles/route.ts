import { NextResponse } from "next/server";
import { investmentCycleService } from "@/services/investment-cycle.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get("strategyId");

    const cycles = strategyId
      ? await investmentCycleService.listByStrategy(strategyId)
      : await investmentCycleService.listMine();

    return NextResponse.json({ cycles });
  } catch (error) {
    return errorResponse(error, "Failed to load investment cycles");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Parameters<typeof investmentCycleService.create>[0];
    const cycle = await investmentCycleService.create(body);
    return NextResponse.json({ cycle });
  } catch (error) {
    return errorResponse(error, "Failed to create investment cycle");
  }
}
