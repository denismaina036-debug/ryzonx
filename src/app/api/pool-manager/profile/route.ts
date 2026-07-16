import { NextResponse } from "next/server";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      bio?: string;
      tradingStyle?: string;
      markets?: string[];
      coverImageUrl?: string;
      profilePhotoUrl?: string;
    };

    await poolManagerDashboardService.updateMyProfile(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
