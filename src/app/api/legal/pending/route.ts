import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { legalDocumentService } from "@/services/legal-document.service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const autoRecordRegistration = user.acceptedLegalAtSignup === true;

    const pending = await legalDocumentService.getPendingAcceptances(user.id, {
      autoRecordRegistration,
    });
    return NextResponse.json({ pending });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load pending legal acceptances" },
      { status: 500 }
    );
  }
}
