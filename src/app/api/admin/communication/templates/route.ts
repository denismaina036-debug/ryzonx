import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { emailTemplateService } from "@/services/communication/email-template.service";

export async function GET(request: Request) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const includeArchived = searchParams.get("includeArchived") === "true";

    const templates = await emailTemplateService.listTemplates({
      category: category as never,
      includeArchived,
    });
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load templates";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
