import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { platformSettingsService } from "@/services/platform-settings.service";

export async function GET() {
  try {
    const settings = await platformSettingsService.list();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load settings." },
      { status: 403 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as { updates?: Array<{ key: string; value: unknown }> };
    if (!body.updates?.length) {
      return NextResponse.json({ error: "No updates provided." }, { status: 400 });
    }

    await platformSettingsService.upsertMany(body.updates, user.id);
    const settings = await platformSettingsService.list();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings." },
      { status: 400 }
    );
  }
}
