import { NextResponse } from "next/server";
import { challengeService } from "@/services/challenge.service";

export async function GET() {
  try {
    const enrollments = await challengeService.getAdminEnrollments();
    return NextResponse.json({ enrollments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load enrollments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
