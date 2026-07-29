import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { legalDocumentService } from "@/services/legal-document.service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { versionIds?: string[] };
    if (!body.versionIds || body.versionIds.length === 0) {
      return NextResponse.json({ error: "Missing versionIds" }, { status: 400 });
    }

    await legalDocumentService.recordAcceptances({
      userId: user.id,
      versionIds: body.versionIds,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record legal acceptance" },
      { status: 500 }
    );
  }
}
