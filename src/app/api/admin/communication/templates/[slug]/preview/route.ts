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
    const body = (await request.json().catch(() => ({}))) as {
      variables?: Record<string, string | number | boolean | null>;
    };

    const result = await emailTemplateService.previewTemplate({
      slug,
      variables: body.variables,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const variables: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== "slug") variables[key] = value;
    }

    const result = await emailTemplateService.previewTemplate({ slug, variables });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
