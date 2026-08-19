import { createAdminClient } from "@/lib/supabase/admin";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { poolCapitalService } from "@/services/investment-engine/pool-capital.service";
import { auditService } from "@/services/audit.service";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

const FUNDING_REVERSIBLE_CYCLE_STATUSES = new Set(["funding", "approved"]);

/**
 * Admin-only: undo a mistaken funding-phase pool join without crediting the wallet.
 * Use when the same deposit was incorrectly allocated to multiple pools.
 */
export const investorCorrectionService = {
  async reverseFundingPhasePoolJoin(input: {
    investorId: string;
    fundId: string;
    actorId: string;
    reason: string;
  }): Promise<{ reversedAmount: number; cycleId: string | null }> {
    const db = createAdminClient();

    const { data: portfolio, error: portfolioError } = await db
      .from("investor_portfolios")
      .select("total_invested, current_value")
      .eq("user_id", input.investorId)
      .eq("fund_id", input.fundId)
      .maybeSingle();

    if (portfolioError) throw new Error(portfolioError.message);

    const invested = toNumber(
      (portfolio as { total_invested?: number | string } | null)?.total_invested
    );
    if (invested <= 0) {
      throw new Error("Investor has no capital in this pool to reverse.");
    }

    const activeCycle = await investmentCycleService.getActiveForFund(input.fundId);
    if (!activeCycle || !FUNDING_REVERSIBLE_CYCLE_STATUSES.has(activeCycle.status)) {
      throw new Error("Only funding-phase pool joins can be reversed with this tool.");
    }

    const { data: allocationRow, error: allocationError } = await db
      .from("investment_allocations")
      .select("id, amount, status")
      .eq("investment_cycle_id", activeCycle.id)
      .eq("investor_id", input.investorId)
      .maybeSingle();

    if (allocationError) throw new Error(allocationError.message);

    const allocation = allocationRow as {
      id: string;
      amount: number | string;
      status: string;
    } | null;

    if (!allocation || allocation.status === "cancelled" || allocation.status === "rejected") {
      throw new Error("No active cycle allocation found for this investor.");
    }

    const amount = toNumber(allocation.amount);
    if (Math.abs(amount - invested) > 0.01) {
      throw new Error("Portfolio invested amount does not match cycle allocation.");
    }

    const { data: fundRow, error: fundError } = await db
      .from("funds")
      .select("name, current_capital, active_investors")
      .eq("id", input.fundId)
      .maybeSingle();

    if (fundError || !fundRow) throw new Error(fundError?.message ?? "Pool not found.");

    await db
      .from("investment_allocations")
      .update({ status: "cancelled" } as never)
      .eq("id", allocation.id);

    await poolCapitalService.applyWithdrawal(input.fundId, input.investorId, amount);

    await db
      .from("investor_portfolios")
      .update({
        total_invested: 0,
        current_value: 0,
        total_deposits: 0,
        unrealized_pnl: 0,
        realized_pnl: 0,
        ownership_percentage: 0,
        investment_start_date: null,
        investment_maturity_date: null,
        investment_duration_days: null,
        last_deposit_at: null,
      } as never)
      .eq("user_id", input.investorId)
      .eq("fund_id", input.fundId);

    const fundStats = fundRow as {
      name: string;
      current_capital?: number | string;
      active_investors?: number | string;
    };

    await db
      .from("funds")
      .update({
        current_capital: Math.max(0, toNumber(fundStats.current_capital) - amount),
        active_investors: Math.max(0, toNumber(fundStats.active_investors) - 1),
        investor_capital: await poolCapitalService.getPoolCapitalTotal(input.fundId),
      } as never)
      .eq("id", input.fundId);

    await db
      .from("transactions")
      .update({
        notes: `Reversed — ${input.reason}`,
        status: "cancelled",
      } as never)
      .eq("user_id", input.investorId)
      .eq("fund_id", input.fundId)
      .eq("type", "adjustment")
      .eq("payment_method", "pool_allocation")
      .eq("status", "completed")
      .eq("amount", amount);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(activeCycle.id);

    await auditService.log({
      actorId: input.actorId,
      action: "investor_funding_join_reversed",
      entityType: "investment_allocation",
      entityId: allocation.id,
      oldValues: {
        fundId: input.fundId,
        amount,
        status: allocation.status,
      },
      newValues: {
        status: "cancelled",
        reason: input.reason,
      },
    });

    return { reversedAmount: amount, cycleId: activeCycle.id };
  },
};
