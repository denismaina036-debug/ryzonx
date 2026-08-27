import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { eventDispatcherService } from "@/services/event-dispatcher.service";
import type { AutomationRuleStatus } from "@/constants/platform-events";
import type { CommunicationChannel } from "@/domain/communication/types";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: AutomationRuleStatus;
      channels?: CommunicationChannel[];
    };
    if (body.status) {
      await eventDispatcherService.updateRuleStatus(id, body.status, user.id);
    }
    if (body.channels) {
      await eventDispatcherService.updateBroadcastChannels(id, body.channels, user.id);
    }
    if (!body.status && !body.channels) {
      return NextResponse.json({ error: "status or channels is required" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to update rule");
  }
}
