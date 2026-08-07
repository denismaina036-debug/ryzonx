import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG } from "@/constants/communication-center";
import { emailTemplateService } from "@/services/communication/email-template.service";
import { prepareAdminMessageContent } from "@/services/communication/email/admin-message-html";

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

    let variables = body.variables;
    if (slug === ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG) {
      await emailTemplateService.ensureCatalogTemplate(slug);
      if (variables?.announcement_body != null) {
        const prepared = prepareAdminMessageContent(String(variables.announcement_body));
        variables = {
          ...variables,
          announcement_body: prepared.html,
          announcement_body_plain: prepared.plainText,
        };
      }
    }

    const result = await emailTemplateService.previewTemplate({
      slug,
      variables,
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
