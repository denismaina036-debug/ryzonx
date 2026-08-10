import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** Admin marketplace seed plus live investor commitments. */
export function mergePublicRaisedCapital(adminSeed: number, liveRaised: number): number {
  return resolvePublicDisplayCount(adminSeed, liveRaised);
}

export async function getFundRaisedCapitalSeed(
  fundId: string | null | undefined
): Promise<number> {
  if (!fundId) return 0;

  const db = createAdminClient();
  const { data, error } = await db
    .from("funds")
    .select("display_raised_capital")
    .eq("id", fundId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return toNumber(
    (data as { display_raised_capital?: number | string | null } | null)?.display_raised_capital
  );
}

export async function loadFundRaisedCapitalSeeds(
  fundIds: string[]
): Promise<Map<string, number>> {
  const seeds = new Map<string, number>();
  if (fundIds.length === 0) return seeds;

  const db = createAdminClient();
  const { data, error } = await db
    .from("funds")
    .select("id, display_raised_capital")
    .in("id", fundIds);

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as Array<{ id: string; display_raised_capital?: number | string | null }>) {
    seeds.set(row.id, toNumber(row.display_raised_capital));
  }

  return seeds;
}
