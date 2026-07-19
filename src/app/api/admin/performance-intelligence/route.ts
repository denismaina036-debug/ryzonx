import { NextResponse } from "next/server";
import { managerRatingService } from "@/services/manager-rating.service";
import { ratingConfigurationService } from "@/services/rating-configuration.service";

export async function GET() {
  try {
    const [dashboard, config] = await Promise.all([
      managerRatingService.getAdminDashboard(),
      ratingConfigurationService.getActiveProfile(),
    ]);
    return NextResponse.json({
      dashboard,
      profile: config?.profile ?? null,
      weights: config?.weights ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load intelligence dashboard";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
