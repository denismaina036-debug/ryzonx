import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { paymentProviderConfigService } from "@/services/payment-provider-config.service";

export async function GET() {
  try {
    return NextResponse.json(await paymentProviderConfigService.getAdminConfig());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load MegaPay configuration." }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const result = await paymentProviderConfigService.updateMegaPay(body, user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save MegaPay configuration.";
    return NextResponse.json({ error: message }, { status: message.includes("permissions") ? 403 : 400 });
  }
}

