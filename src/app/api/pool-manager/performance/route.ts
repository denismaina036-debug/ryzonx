import { NextResponse } from "next/server";
import { managerRatingService } from "@/services/manager-rating.service";

export async function GET() {
  try {
    const [rating, bundle] = await Promise.all([
      managerRatingService.getForCurrentManager(),
      managerRatingService.getPerformanceBundleForCurrentManager(),
    ]);
    return NextResponse.json({ rating, bundle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load performance data";
    const status = message.includes("permissions") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
