import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { emailTemplateService } from "@/services/communication/email-template.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { slug } = await params;
    const versions = await emailTemplateService.listVersions(slug);
    return NextResponse.json({ versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load versions";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { slug } = await params;
    const body = (await request.json()) as { versionNumber: number };
    const template = await emailTemplateService.restoreVersion(slug, body.versionNumber);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore version failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
