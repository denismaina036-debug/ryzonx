import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  POOL_IMAGE_BUCKET,
  POOL_IMAGE_MAX_BYTES,
  POOL_IMAGE_MIME_TYPES,
  type PoolImageMimeType,
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

function isAllowedMime(mime: string): mime is PoolImageMimeType {
  return (POOL_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

function sanitizePoolSegment(poolId?: string): string {
  if (!poolId?.trim()) return "drafts";
  return poolId.replace(/[^a-zA-Z0-9-_]/g, "");
}

export const poolImageService = {
  async uploadPoolImage(
    file: File,
    poolId?: string
  ): Promise<{ imageUrl: string; objectPath: string }> {
    await requireRole(USER_ROLES.POOL_MANAGER);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated.");

    if (!isAllowedMime(file.type)) {
      throw new Error("Please upload a JPEG, PNG, WebP, or GIF image.");
    }

    if (file.size > POOL_IMAGE_MAX_BYTES) {
      throw new Error("Pool image must be 5 MB or smaller.");
    }

    const ext = extensionForMime(file.type);
    const poolSegment = sanitizePoolSegment(poolId);
    const objectPath = `${user.id}/${poolSegment}/cover.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(POOL_IMAGE_BUCKET)
      .upload(objectPath, buffer, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(POOL_IMAGE_BUCKET)
      .getPublicUrl(objectPath);

    const imageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    return { imageUrl, objectPath };
  },
};
