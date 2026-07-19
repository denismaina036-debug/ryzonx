import { NextResponse } from "next/server";
import { adminNotesService } from "@/services/admin-notes.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }
    const notes = await adminNotesService.listNotes(entityType, entityId);
    return NextResponse.json({ notes });
  } catch (error) {
    return errorResponse(error, "Failed to load notes");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      entityType: string;
      entityId: string;
      note: string;
    };
    if (!body.entityType || !body.entityId || !body.note?.trim()) {
      return NextResponse.json({ error: "entityType, entityId, and note are required" }, { status: 400 });
    }
    const note = await adminNotesService.addNote(body);
    return NextResponse.json({ note });
  } catch (error) {
    return errorResponse(error, "Failed to add note");
  }
}
