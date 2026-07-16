import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { emailTemplateService } from "@/services/communication/email-template.service";

export async function POST() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const result = await emailTemplateService.syncCatalog();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
