import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";

export function revalidatePoolMarketplaceSurfaces(poolSlug?: string | null): void {
  revalidatePath(ROUTES.marketplace);
  revalidatePath(ROUTES.marketplaceStrategies);
  revalidatePath(ROUTES.marketplaceCycles);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.investments);

  if (poolSlug) {
    revalidatePath(`${ROUTES.marketplace}/${poolSlug}`);
    revalidatePath(`${ROUTES.marketplace}/${poolSlug}/join`);
  }
}
