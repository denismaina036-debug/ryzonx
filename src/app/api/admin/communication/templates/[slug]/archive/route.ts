import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { emailTemplateService } from "@/services/communication/email-template.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { slug } = await params;
    await emailTemplateService.archiveTemplate(slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
