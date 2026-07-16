import { NextResponse } from "next/server";
import { challengeService } from "@/services/challenge.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      accountDetails?: string;
      rules?: string;
    };

    if (!body.accountDetails?.trim() || !body.rules?.trim()) {
      return NextResponse.json(
        { error: "Account details and rules are required." },
        { status: 400 }
      );
    }

    await challengeService.setupEnrollment(id, {
      accountDetails: body.accountDetails,
      rules: body.rules,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
