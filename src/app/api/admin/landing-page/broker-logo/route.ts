import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { landingBrokerLogoService } from "@/services/landing-broker-logo.service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const brokerId = formData.get("brokerId");
    const file = formData.get("file");

    if (typeof brokerId !== "string" || !brokerId.trim()) {
      return NextResponse.json({ error: "Missing brokerId" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const logoUrl = await landingBrokerLogoService.uploadLogo({ brokerId, file });
    return NextResponse.json({ logoUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
