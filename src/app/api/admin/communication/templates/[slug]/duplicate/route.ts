import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { emailTemplateService } from "@/services/communication/email-template.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { slug } = await params;
    const body = (await request.json().catch(() => ({}))) as { newSlug?: string };
    const template = await emailTemplateService.duplicateTemplate(slug, body.newSlug);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duplicate failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
