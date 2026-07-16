import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { tradeAdminService } from "@/services/trade-admin.service";

export async function POST(request: Request) {
  try {
    const admin = await requireRole("administrator");
    const formData = await request.formData();
    const file = formData.get("file");
    const tradeId = formData.get("tradeId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No screenshot file provided." }, { status: 400 });
    }

    const url = await tradeAdminService.uploadTradeScreenshot(file, file.type, {
      tradeId: typeof tradeId === "string" && tradeId ? tradeId : undefined,
      adminId: admin.id,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
