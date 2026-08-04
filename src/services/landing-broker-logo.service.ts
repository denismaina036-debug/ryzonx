import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
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

export const landingBrokerLogoService = {
  async uploadLogo(input: { brokerId: string; file: File }): Promise<string> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");

    if (!isAllowedMime(input.file.type)) {
      throw new Error("Please upload a JPEG, PNG, WebP, or GIF image.");
    }

    if (input.file.size > POOL_IMAGE_MAX_BYTES) {
      throw new Error("Broker logo must be 5 MB or smaller.");
    }

    const safeId = input.brokerId.replace(/[^a-zA-Z0-9-_]/g, "");
    const objectPath = `landing/brokers/${safeId}.${extensionForMime(input.file.type)}`;
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from(POOL_IMAGE_BUCKET)
      .upload(objectPath, buffer, {
        upsert: true,
        contentType: input.file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = admin.storage.from(POOL_IMAGE_BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  },
};
