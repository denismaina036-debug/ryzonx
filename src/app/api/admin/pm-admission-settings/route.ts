import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { pmAdmissionSettingsService } from "@/services/pm-admission-settings.service";
import type { PmAdmissionSettings } from "@/domain/pool-manager/admission-settings";

export async function GET() {
  try {
    await requireAuth();
    const settings = await pmAdmissionSettingsService.get();
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load settings";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as { settings?: PmAdmissionSettings };

    if (!body.settings) {
      return NextResponse.json({ error: "settings is required" }, { status: 400 });
    }

    const settings = await pmAdmissionSettingsService.update(body.settings, user.id);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
