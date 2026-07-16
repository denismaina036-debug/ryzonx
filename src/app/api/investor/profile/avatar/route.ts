import { NextResponse } from "next/server";
import { profileAvatarService } from "@/services/profile-avatar.service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No photo selected." }, { status: 400 });
    }

    const result = await profileAvatarService.uploadAvatar(file);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
