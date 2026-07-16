import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";

export async function GET() {
  try {
    const [application, challenge] = await Promise.all([
      poolManagerApplicationService.getMyApplication(),
      poolManagerApplicationService.getActiveChallengeForApplication(),
    ]);
    return NextResponse.json({ application, challenge });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load application";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  try {
    const application = await poolManagerApplicationService.getOrCreateApplication();
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start application";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
