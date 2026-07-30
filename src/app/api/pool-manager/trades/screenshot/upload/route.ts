import { NextResponse } from "next/server";
import { tradeEntryScreenshotService } from "@/services/trade-entry-screenshot.service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const entryId = formData.get("entryId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No screenshot file provided." }, { status: 400 });
    }

    const url = await tradeEntryScreenshotService.uploadForManager(
      file,
      file.type,
      typeof entryId === "string" && entryId ? entryId : undefined
    );

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
