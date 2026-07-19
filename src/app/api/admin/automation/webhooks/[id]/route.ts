import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { webhookService } from "@/services/webhook.service";

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
    const body = (await request.json()) as { isActive?: boolean };
    if (body.isActive === undefined) {
      return NextResponse.json({ error: "isActive is required" }, { status: 400 });
    }
    await webhookService.toggleActive(id, body.isActive, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to update webhook");
  }
}
