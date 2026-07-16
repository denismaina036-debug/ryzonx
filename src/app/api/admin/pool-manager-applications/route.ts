import { NextResponse } from "next/server";
import { poolManagerAdminService } from "@/services/pool-manager-application.service";

export async function GET() {
  try {
    const applications = await poolManagerAdminService.listApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load applications";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
