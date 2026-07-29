import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCoverImageUrl } from "@/lib/pools/cover-image-url";
import { revalidatePoolMarketplaceSurfaces } from "@/lib/pools/revalidate-pool-surfaces";
import {
  DEFAULT_COVER_IMAGE_POSITION,
  serializeCoverImagePosition,
  type CoverImagePosition,
} from "@/domain/pools/cover-image-position";

export async function persistPoolCoverImage(input: {
  poolId: string;
  coverImageUrl: string | null;
  coverImagePosition?: CoverImagePosition | null;
}): Promise<string | null> {
  const db = createAdminClient();
  const { data: fund, error: fetchError } = await db
    .from("funds")
    .select("slug")
    .eq("id", input.poolId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!fund) throw new Error("Pool not found.");

  const normalized = input.coverImageUrl?.trim()
    ? normalizeCoverImageUrl(input.coverImageUrl)
    : null;

  const { error: updateError } = await db
    .from("funds")
    .update({
      cover_image_url: normalized,
      cover_image_position: serializeCoverImagePosition(
        input.coverImagePosition ?? DEFAULT_COVER_IMAGE_POSITION
      ),
    } as never)
    .eq("id", input.poolId);

  if (updateError) throw new Error(updateError.message);

  revalidatePoolMarketplaceSurfaces((fund as { slug?: string | null }).slug ?? null);
  return normalized;
}
