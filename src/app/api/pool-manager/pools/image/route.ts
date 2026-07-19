import { NextResponse } from "next/server";
import { poolImageService } from "@/services/pool-image.service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const poolId = formData.get("poolId");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No image selected." }, { status: 400 });
    }

    const result = await poolImageService.uploadPoolImage(
      file,
      typeof poolId === "string" ? poolId : undefined
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("permissions") || message.includes("Not authenticated")
      ? 403
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
