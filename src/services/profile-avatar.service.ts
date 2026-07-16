import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  PROFILE_ICON_BUCKET,
  PROFILE_ICON_MAX_BYTES,
  PROFILE_ICON_MIME_TYPES,
  type ProfileIconMimeType,
} from "@/constants/storage";

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function isAllowedMime(mime: string): mime is ProfileIconMimeType {
  return (PROFILE_ICON_MIME_TYPES as readonly string[]).includes(mime);
}

async function syncPoolManagerPhoto(userId: string, avatarUrl: string) {
  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== USER_ROLES.POOL_MANAGER) {
    return;
  }

  await db
    .from("pool_managers")
    .update({
      profile_photo_url: avatarUrl,
      icon_url: avatarUrl,
    } as never)
    .eq("user_id", userId);
}

export const profileAvatarService = {
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const user = await requireAuth();

    if (!isAllowedMime(file.type)) {
      throw new Error("Please upload a JPEG, PNG, WebP, or GIF image.");
    }

    if (file.size > PROFILE_ICON_MAX_BYTES) {
      throw new Error("Profile photo must be 5 MB or smaller.");
    }

    const ext = extensionForMime(file.type);
    const objectPath = `${user.id}/avatar.${ext}`;
    const supabase = await createClient();

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_ICON_BUCKET)
      .upload(objectPath, buffer, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_ICON_BUCKET)
      .getPublicUrl(objectPath);

    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl } as never)
      .eq("id", user.id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    await syncPoolManagerPhoto(user.id, avatarUrl);

    return { avatarUrl };
  },
};
