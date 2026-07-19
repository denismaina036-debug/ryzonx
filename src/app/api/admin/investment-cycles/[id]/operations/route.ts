import { NextResponse } from "next/server";
import { adminOperationsJournalService } from "@/services/admin-operations-journal.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message.includes("permissions") || message.includes("Insufficient")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const operations = await adminOperationsJournalService.getCycleOperations(id);
    return NextResponse.json(operations);
  } catch (error) {
    return errorResponse(error, "Failed to load cycle operations");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action: string; reason?: string; note?: string };
    if (body.action === "flag") {
      const event = await adminOperationsJournalService.flagOperationalIssue(id, body.reason ?? "");
      return NextResponse.json({ event });
    }
    if (body.action === "review") {
      const event = await adminOperationsJournalService.recordReview(id, body.note);
      return NextResponse.json({ event });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "Failed to record administrative action");
  }
}
