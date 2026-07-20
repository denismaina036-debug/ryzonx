import { NextResponse } from "next/server";
import { pmAdmissionSettingsService } from "@/services/pm-admission-settings.service";

export async function GET() {
  try {
    const settings = await pmAdmissionSettingsService.getPublic();
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
