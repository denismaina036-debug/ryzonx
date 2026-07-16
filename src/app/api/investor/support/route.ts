import { NextResponse } from "next/server";
import { supportService } from "@/services/support.service";

export async function GET() {
  try {
    const tickets = await supportService.getInvestorTickets();
    return NextResponse.json({ tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tickets.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { subject: string; message: string };
    if (!body.subject?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: "Subject and message required." }, { status: 400 });
    }
    const ticket = await supportService.createTicket(body.subject, body.message);
    return NextResponse.json(ticket);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create ticket.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
