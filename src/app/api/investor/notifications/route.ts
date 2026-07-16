import { NextResponse } from "next/server";
import { notificationService } from "@/services/notification.service";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; markAll?: boolean };

    if (body.markAll) {
      await notificationService.markAllAsRead();
      return NextResponse.json({ ok: true });
    }

    if (!body.id) {
      return NextResponse.json({ error: "Notification id required." }, { status: 400 });
    }

    await notificationService.markAsRead(body.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
