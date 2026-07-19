import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnvSafe } from "@/lib/env";
import {
  DEFAULT_FUND_ID,
  DEFAULT_FUND_NAME,
  DEFAULT_FUND_SLUG,
} from "@/constants/funds";

const PLATFORM_MANAGER_ID = "00000000-0000-4000-a000-000000000010";

/**
 * Ensures the platform funding wallet fund row exists (DEFAULT_FUND_ID).
 * Required for deposits, withdrawals, and investor_portfolios FK integrity.
 */
export async function ensurePlatformFundingFund(): Promise<void> {
  if (!getServerEnvSafe()) {
    return;
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("funds")
    .select("id")
    .eq("id", DEFAULT_FUND_ID)
    .maybeSingle();

  if (existing) {
    return;
  }

  await admin.from("pool_managers").upsert(
    {
      id: PLATFORM_MANAGER_ID,
      display_name: "RyvonX Trading Desk",
      bio: "Official RyvonX platform-managed operator.",
      status: "approved",
      is_platform_managed: true,
      approved_at: new Date().toISOString(),
    } as never,
    { onConflict: "id" }
  );

  const { error: fundError } = await admin.from("funds").insert({
    id: DEFAULT_FUND_ID,
    name: DEFAULT_FUND_NAME,
    slug: DEFAULT_FUND_SLUG,
    description: "Platform funding wallet for investor deposits and allocations.",
    status: "active",
    is_default: true,
    pool_manager_id: PLATFORM_MANAGER_ID,
    lifecycle_status: "live",
    is_marketplace_listed: false,
    min_investment: 100,
  } as never);

  if (fundError && !fundError.message.includes("duplicate")) {
    throw new Error(fundError.message);
  }

  const { data: stats } = await admin
    .from("pool_stats")
    .select("id")
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  if (!stats) {
    await admin.from("pool_stats").insert({ fund_id: DEFAULT_FUND_ID } as never);
  }
}
