import { NextResponse } from "next/server";
import { notificationPreferenceService } from "@/services/notification-preference.service";
import type { CommunicationCategory, CommunicationChannel } from "@/domain/communication/types";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const preferences = await notificationPreferenceService.getForCurrentUser();
    return NextResponse.json({ preferences });
  } catch (error) {
    return errorResponse(error, "Failed to load preferences");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      category?: CommunicationCategory;
      channel?: CommunicationChannel;
      isEnabled?: boolean;
      preferences?: Array<{
        category: CommunicationCategory;
        channel: CommunicationChannel;
        isEnabled: boolean;
      }>;
    };

    if (body.preferences?.length) {
      await notificationPreferenceService.updateMany(body.preferences);
    } else if (body.category && body.channel && body.isEnabled !== undefined) {
      await notificationPreferenceService.updatePreference(body.category, body.channel, body.isEnabled);
    } else {
      return NextResponse.json({ error: "Invalid preference payload" }, { status: 400 });
    }

    const preferences = await notificationPreferenceService.getForCurrentUser();
    return NextResponse.json({ preferences });
  } catch (error) {
    return errorResponse(error, "Failed to update preferences");
  }
}
