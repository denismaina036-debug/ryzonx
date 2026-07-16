import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnvSafe } from "@/lib/env";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { formatFullName } from "@/lib/auth/register";
import type { User } from "@supabase/supabase-js";

/**
 * Ensure profile + default portfolio exist after signup/login.
 * Uses service role — only call from trusted server code.
 * Never overwrites an existing profile role (preserves administrators).
 */
export async function ensureInvestorBootstrap(user: User): Promise<void> {
  if (!getServerEnvSafe()) {
    return;
  }

  const admin = createAdminClient();
  const meta = user.user_metadata ?? {};

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const fullName =
      typeof meta.full_name === "string" && meta.full_name.trim()
        ? meta.full_name.trim()
        : formatFullName({
            firstName: String(meta.first_name ?? "Investor"),
            middleName: meta.middle_name ? String(meta.middle_name) : undefined,
            lastName: String(meta.last_name ?? ""),
          });

    const phone =
      typeof meta.phone === "string" && meta.phone.trim()
        ? meta.phone.trim()
        : null;

    await admin.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      full_name: fullName || "Investor",
      phone,
      role: "investor",
      is_active: true,
    });
  }

  const { data: existingPortfolio } = await admin
    .from("investor_portfolios")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  if (!existingPortfolio) {
    await admin.from("investor_portfolios").insert({
      user_id: user.id,
      fund_id: DEFAULT_FUND_ID,
      total_invested: 0,
      current_value: 0,
      ownership_percentage: 0,
      unrealized_pnl: 0,
      realized_pnl: 0,
      total_deposits: 0,
      total_withdrawals: 0,
      available_balance: 0,
    });
  }
}
