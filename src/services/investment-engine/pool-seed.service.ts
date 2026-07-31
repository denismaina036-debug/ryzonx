import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoney } from "@/lib/investment-engine/ownership";
import { poolCapitalService } from "./pool-capital.service";

export const poolSeedService = {
  async applySeedCapitalIfConfigured(fundId: string): Promise<{ seeded: boolean; total: number }> {
    const db = createAdminClient();
    const { data: fund, error } = await db
      .from("funds")
      .select("seed_pool_capital, seed_investor_count, investor_capital")
      .eq("id", fundId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fund) return { seeded: false, total: 0 };

    const seedCapital = Number((fund as { seed_pool_capital: number | null }).seed_pool_capital ?? 0);
    const seedCount = Number((fund as { seed_investor_count: number | null }).seed_investor_count ?? 0);
    if (seedCapital <= 0 || seedCount <= 0) {
      return { seeded: false, total: await poolCapitalService.getPoolCapitalTotal(fundId) };
    }

    const existing = await poolCapitalService.listPositions(fundId);
    if (existing.length > 0) {
      return { seeded: false, total: await poolCapitalService.getPoolCapitalTotal(fundId) };
    }

    const perInvestor = roundMoney(seedCapital / seedCount);
    let allocated = 0;
    const rows = Array.from({ length: seedCount }, (_, i) => {
      const isLast = i === seedCount - 1;
      const capital = isLast ? roundMoney(seedCapital - allocated) : perInvestor;
      allocated += capital;
      return {
        fund_id: fundId,
        is_virtual: true,
        virtual_label: `Seed Investor ${i + 1}`,
        capital,
      };
    });

    const { error: insertError } = await db.from("pool_investor_positions").insert(rows as never);
    if (insertError) throw new Error(insertError.message);

    const total = await poolCapitalService.syncFundInvestorCapital(fundId);
    return { seeded: true, total };
  },
};
