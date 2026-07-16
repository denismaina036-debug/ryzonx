import { NextResponse } from "next/server";
import { supportService } from "@/services/support.service";

export async function GET() {
  try {
    const tickets = await supportService.getAdminTickets();
    return NextResponse.json({ tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tickets.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
