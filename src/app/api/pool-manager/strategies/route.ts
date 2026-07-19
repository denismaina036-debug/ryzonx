import { NextResponse } from "next/server";
import { strategyService } from "@/services/strategy.service";

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
    const strategies = await strategyService.listMine();
    return NextResponse.json({ strategies });
  } catch (error) {
    return errorResponse(error, "Failed to load strategies");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Parameters<typeof strategyService.create>[0];
    const strategy = await strategyService.create(body);
    return NextResponse.json({ strategy });
  } catch (error) {
    return errorResponse(error, "Failed to create strategy");
  }
}
