import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationCenterService } from "@/services/communication";
import type { CommunicationChannel } from "@/domain/communication/types";

export async function GET() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const messages = await communicationCenterService.listAdminMessages(50);
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = await request.json();

    const channels = (body.channels ?? []) as CommunicationChannel[];
    const result = await communicationCenterService.sendAdminMessage({
      audience: body.audience === "individual" ? "individual" : "all",
      recipientUserId: body.recipientUserId,
      channels,
      heading: body.heading ?? "",
      content: body.content ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
