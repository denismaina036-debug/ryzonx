import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationService } from "@/services/communication";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { deliveryId } = await params;
    await communicationService.retryDelivery(deliveryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
