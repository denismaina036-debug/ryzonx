import { NextResponse } from "next/server";
import { challengeCenterService } from "@/services/challenge-center.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await params;
    const state = await challengeCenterService.getAdminReviewState(enrollmentId);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await params;
    const body = (await request.json()) as {
      outcome?: "passed" | "failed";
      notes?: string;
    };

    if (!body.outcome) {
      return NextResponse.json({ error: "outcome is required" }, { status: 400 });
    }

    await challengeCenterService.markChallengeOutcome({
      enrollmentId,
      outcome: body.outcome,
      notes: body.notes,
    });

    const state = await challengeCenterService.getAdminReviewState(enrollmentId);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
