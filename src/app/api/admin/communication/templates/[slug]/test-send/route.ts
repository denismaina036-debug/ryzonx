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
    const body = (await request.json()) as {
      recipientEmail: string;
      variables?: Record<string, string | number | boolean | null>;
    };

    if (!body.recipientEmail?.trim()) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const result = await emailTemplateService.sendTestEmail({
      slug,
      recipientEmail: body.recipientEmail.trim(),
      variables: body.variables,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test send failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
