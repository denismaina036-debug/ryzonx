import { NextResponse } from "next/server";
import { cycleIntelligenceService } from "@/services/cycle-intelligence.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const intelligence = await cycleIntelligenceService.getForCycleSlug(slug);
    if (!intelligence) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }
    return NextResponse.json({ intelligence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cycle intelligence";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
