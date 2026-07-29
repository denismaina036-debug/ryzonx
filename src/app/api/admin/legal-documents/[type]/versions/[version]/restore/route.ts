import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { legalDocumentService } from "@/services/legal-document.service";
import { isLegalDocumentType } from "@/domain/legal-documents/defaults";

interface RouteContext {
  params: Promise<{ type: string; version: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, version } = await context.params;
    if (!isLegalDocumentType(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const versionNumber = Number.parseInt(version, 10);
    if (!Number.isFinite(versionNumber)) {
      return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
    }

    const document = await legalDocumentService.restoreVersion({
      documentType: type,
      versionNumber,
      actorId: user.id,
    });

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore legal document version" },
      { status: 500 }
    );
  }
}
