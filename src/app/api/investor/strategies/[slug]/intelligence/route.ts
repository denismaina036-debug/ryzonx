import { NextResponse } from "next/server";
import { strategyIntelligenceService } from "@/services/strategy-intelligence.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const intelligence = await strategyIntelligenceService.getForStrategySlug(slug);
    if (!intelligence) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return NextResponse.json({ intelligence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load strategy intelligence";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
