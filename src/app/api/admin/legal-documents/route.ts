import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { legalDocumentService } from "@/services/legal-document.service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const documents = await legalDocumentService.listAdminDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load legal documents" },
      { status: 500 }
    );
  }
}
