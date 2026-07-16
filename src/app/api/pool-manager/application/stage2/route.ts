import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      enrollmentId?: string;
      complete?: boolean;
    };

    if (body.enrollmentId) {
      const application = await poolManagerApplicationService.linkChallengeEnrollment(
        body.enrollmentId
      );
      return NextResponse.json({ application });
    }

    if (body.complete) {
      const application = await poolManagerApplicationService.completeStage2();
      return NextResponse.json({ application });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
