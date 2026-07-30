import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import {
  TRADE_SCREENSHOT_BUCKET,
  TRADE_SCREENSHOT_MAX_BYTES,
  extensionForMime,
  isAllowedScreenshotMime,
} from "@/lib/storage/trade-screenshots";

export const tradeEntryScreenshotService = {
  async uploadForManager(file: Blob, mimeType: string, entryId?: string): Promise<string> {
    await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await poolManagerDashboardService.getManagerId();
    const db = createAdminClient();

    if (!isAllowedScreenshotMime(mimeType)) {
      throw new Error("Screenshot must be a JPEG, PNG, WebP, or GIF image.");
    }
    if (file.size > TRADE_SCREENSHOT_MAX_BYTES) {
      throw new Error("Screenshot must be 5 MB or smaller.");
    }
    if (file.size === 0) {
      throw new Error("Screenshot file is empty.");
    }

    const ext = extensionForMime(mimeType);
    const folder = entryId ? `entries/${entryId}` : `entries/pending/${managerId}`;
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from(TRADE_SCREENSHOT_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = db.storage.from(TRADE_SCREENSHOT_BUCKET).getPublicUrl(path);
    if (!data.publicUrl) throw new Error("Failed to resolve screenshot URL.");
    return data.publicUrl;
  },
};
