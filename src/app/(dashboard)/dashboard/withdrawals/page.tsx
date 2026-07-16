import { DEFAULT_FUND_ID } from "@/constants/funds";
import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvestorWithdrawalsView } from "@/features/investor/components/investor-withdrawals-view";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export default async function WithdrawalsPage() {
  const user = await requireAuth();
  const db = createAdminClient();

  const { data: portfolio } = await db
    .from("investor_portfolios")
    .select("available_balance")
    .eq("user_id", user.id)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  const availableBalance = toNumber(
    (portfolio as { available_balance?: number } | null)?.available_balance
  );

  return <InvestorWithdrawalsView availableBalance={availableBalance} />;
}
