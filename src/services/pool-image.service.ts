import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  POOL_IMAGE_BUCKET,
  POOL_IMAGE_MAX_BYTES,
  POOL_IMAGE_MIME_TYPES,
  type PoolImageMimeType,
} from "@/constants/storage";
import { normalizeCoverImageUrl } from "@/lib/pools/cover-image-url";
import { persistPoolCoverImage } from "@/lib/pools/persist-pool-cover-image";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { DEFAULT_COVER_IMAGE_POSITION } from "@/domain/pools/cover-image-position";

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

async function uploadToPoolBucket(
  file: File,
  objectPath: string
): Promise<string> {
  if (!isAllowedMime(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WebP, or GIF image.");
  }

  if (file.size > POOL_IMAGE_MAX_BYTES) {
    throw new Error("Pool image must be 5 MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(POOL_IMAGE_BUCKET)
    .upload(objectPath, buffer, {
      upsert: true,
      contentType: file.type,
      cacheControl: "60",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = admin.storage
    .from(POOL_IMAGE_BUCKET)
    .getPublicUrl(objectPath);

  return normalizeCoverImageUrl(publicUrlData.publicUrl) ?? publicUrlData.publicUrl;
}

async function assertPoolManagerOwnsPool(poolId: string): Promise<void> {
  const managerId = await poolManagerDashboardService.getManagerId();
  const db = createAdminClient();
  const { data: fund, error } = await db
    .from("funds")
    .select("pool_manager_id")
    .eq("id", poolId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!fund) throw new Error("Pool not found.");
  if ((fund as { pool_manager_id: string | null }).pool_manager_id !== managerId) {
    throw new Error("Not your pool.");
  }
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

    const ext = extensionForMime(file.type);
    const poolSegment = sanitizePoolSegment(poolId);
    const objectPath = `${user.id}/${poolSegment}/cover.${ext}`;
    const uploadedUrl = await uploadToPoolBucket(file, objectPath);

    let imageUrl = uploadedUrl;
    if (poolId) {
      await assertPoolManagerOwnsPool(poolId);
      imageUrl =
        (await persistPoolCoverImage({
          poolId,
          coverImageUrl: uploadedUrl,
          coverImagePosition: DEFAULT_COVER_IMAGE_POSITION,
        })) ?? uploadedUrl;
    }

    return { imageUrl, objectPath };
  },

  async uploadPoolCoverAsAdmin(
    file: File,
    poolId: string
  ): Promise<{ imageUrl: string; objectPath: string }> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const ext = extensionForMime(file.type);
    const objectPath = `admin/${sanitizePoolSegment(poolId)}/cover.${ext}`;
    const uploadedUrl = await uploadToPoolBucket(file, objectPath);
    const imageUrl =
      (await persistPoolCoverImage({
        poolId,
        coverImageUrl: uploadedUrl,
        coverImagePosition: DEFAULT_COVER_IMAGE_POSITION,
      })) ?? uploadedUrl;

    return { imageUrl, objectPath };
  },

  async clearPoolCoverAsAdmin(poolId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    await persistPoolCoverImage({
      poolId,
      coverImageUrl: null,
      coverImagePosition: DEFAULT_COVER_IMAGE_POSITION,
    });
  },
};
