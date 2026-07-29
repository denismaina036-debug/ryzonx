import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { legalDocumentService } from "@/services/legal-document.service";
import { isLegalDocumentType } from "@/domain/legal-documents/defaults";
import type { LegalDocumentSeo, LegalSection } from "@/domain/legal-documents/types";

interface RouteContext {
  params: Promise<{ type: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await context.params;
    if (!isLegalDocumentType(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const [document, versions] = await Promise.all([
      legalDocumentService.getAdminDocument(type),
      legalDocumentService.listVersions(type),
    ]);

    return NextResponse.json({ document, versions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load legal document" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await context.params;
    if (!isLegalDocumentType(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const body = (await request.json()) as {
      seo?: LegalDocumentSeo;
      sections?: LegalSection[];
    };

    if (!body.seo || !body.sections) {
      return NextResponse.json({ error: "Missing seo or sections" }, { status: 400 });
    }

    const document = await legalDocumentService.saveDraft({
      documentType: type,
      seo: body.seo,
      sections: body.sections,
      actorId: user.id,
    });

    revalidatePath("/terms");
    revalidatePath("/privacy");
    revalidatePath(`/${body.seo.slug}`);

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save legal document" },
      { status: 500 }
    );
  }
}
