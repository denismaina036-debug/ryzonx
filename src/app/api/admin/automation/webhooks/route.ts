import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { webhookService } from "@/services/webhook.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const webhooks = await webhookService.list();
    return NextResponse.json({ webhooks });
  } catch (error) {
    return errorResponse(error, "Failed to load webhooks");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as {
      name?: string;
      url?: string;
      eventTypePattern?: string;
    };
    if (!body.name?.trim() || !body.url?.trim()) {
      return NextResponse.json({ error: "name and url are required" }, { status: 400 });
    }
    const webhook = await webhookService.register({
      name: body.name,
      url: body.url,
      eventTypePattern: body.eventTypePattern,
      actorId: user.id,
    });
    return NextResponse.json({ webhook });
  } catch (error) {
    return errorResponse(error, "Failed to register webhook");
  }
}
