import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";

export async function POST() {
  try {
    const application = await poolManagerApplicationService.restartApplication();
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restart application";
    const status = message.includes("Authentication") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
