import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { campaignCenterService } from "@/services/communication";

export async function GET() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const campaigns = await campaignCenterService.list();
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = await request.json();
    const campaign = await campaignCenterService.create({
      name: body.name,
      templateSlug: body.templateSlug,
      scheduledAt: body.scheduledAt,
      audienceFilter: { campaignType: body.campaignType, audience: body.audience ?? "everyone" },
    });
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
