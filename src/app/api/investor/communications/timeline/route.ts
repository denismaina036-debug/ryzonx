import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { communicationTimelineService } from "@/services/communication/communication-timeline.service";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    const timeline = await communicationTimelineService.getUserTimeline(limit);
    return NextResponse.json({ timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load timeline";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
