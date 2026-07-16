import { NextResponse } from "next/server";
import { profileService } from "@/services/profile.service";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      phone?: string;
      showActivityPublicly?: boolean;
    };
    const settings = await profileService.updateInvestorSettings(body);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
