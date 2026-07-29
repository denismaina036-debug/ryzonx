import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { legalDocumentService } from "@/services/legal-document.service";

/** Records acceptance of all currently published legal documents (registration flow). */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await legalDocumentService.recordCurrentPublishedAcceptances(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record legal acceptance" },
      { status: 500 }
    );
  }
}
