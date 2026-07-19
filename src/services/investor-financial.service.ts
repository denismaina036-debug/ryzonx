import { requireAuth } from "@/lib/auth/session";
import { INVESTMENT_ALLOCATION_STATUS_LABELS } from "@/constants/investment-allocation";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { distributionService } from "@/services/distribution.service";
import { walletProjectionService } from "@/services/wallet-projection.service";
import { statementService } from "@/services/statement.service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvestorFinancialView } from "@/domain/financial/types";

export const investorFinancialService = {
  async getFinancialView(): Promise<InvestorFinancialView> {
    const user = await requireAuth();

    const [wallet, allocations, distributions, profitAllocRows] = await Promise.all([
      walletProjectionService.getForInvestor(user.id),
      investmentAllocationService.listMine(),
      distributionService.listForInvestor(user.id),
      (async () => {
        const db = createAdminClient();
        const { data: allocs } = await db
          .from("profit_settlement_allocations")
          .select("id, profit_share, status, transferred_at, profit_settlement_id")
          .eq("investor_id", user.id)
          .eq("status", "transferred")
          .order("created_at", { ascending: false })
          .limit(30);
        const rows = (allocs ?? []) as Array<{
          id: string;
          profit_share: number;
          status: string;
          transferred_at: string | null;
          profit_settlement_id: string;
        }>;
        if (rows.length === 0) return [];
        const settlementIds = [...new Set(rows.map((r) => r.profit_settlement_id))];
        const { data: settlements } = await db
          .from("profit_settlements")
          .select("id, investment_cycle_id, settlement_date")
          .in("id", settlementIds);
        const settlementMap = new Map(
          ((settlements ?? []) as Array<{
            id: string;
            investment_cycle_id: string;
            settlement_date: string | null;
          }>).map((s) => [s.id, s])
        );
        return rows.map((r) => ({
          ...r,
          settlement: settlementMap.get(r.profit_settlement_id) ?? null,
        }));
      })(),
    ]);

    const settlementStatus: Record<string, string> = {};
    for (const allocation of allocations) {
      if (allocation.status === "cancelled") continue;
      const cycle = await investmentCycleService.getById(allocation.investmentCycleId);
      settlementStatus[allocation.referenceNumber] = INVESTMENT_ALLOCATION_STATUS_LABELS[allocation.status];
      if (cycle) {
        settlementStatus[allocation.referenceNumber] += ` — ${cycle.name}`;
      }
    }

    const distributionStatus = await Promise.all(
      distributions.slice(0, 20).map(async (record) => {
        const cycle = await investmentCycleService.getById(record.investmentCycleId);
        return {
          cycleName: cycle?.name ?? "Cycle",
          status: record.status,
          amount: record.amount,
        };
      })
    );

    const timeline: InvestorFinancialView["timeline"] = [
      ...allocations.map((a) => ({
        label: `${a.referenceNumber} — ${INVESTMENT_ALLOCATION_STATUS_LABELS[a.status]}`,
        occurredAt: a.fundingConfirmedAt ?? a.settledAt ?? a.allocatedAt,
        amount: a.amount,
      })),
      ...distributions
        .filter((d) => d.completedAt)
        .map((d) => ({
          label: `Distribution ${d.status}`,
          occurredAt: d.completedAt!,
          amount: d.amount,
        })),
      ...(await Promise.all(
        profitAllocRows
          .filter((r) => r.transferred_at)
          .map(async (r) => {
            const cycleId = r.settlement?.investment_cycle_id;
            const cycle = cycleId ? await investmentCycleService.getById(cycleId) : null;
            const fundName = cycle?.name ?? "Pool";
            return {
              label: `Investment Profit Distribution — ${fundName}`,
              occurredAt: r.transferred_at!,
              amount: Number(r.profit_share),
            };
          })
      )),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return {
      wallet,
      settlementStatus,
      distributionStatus,
      timeline: timeline.slice(0, 25),
    };
  },

  async getStatementHistory() {
    const user = await requireAuth();
    const statement = await statementService.getInvestorStatement(user.id);
    return [statementService.toExportPayload(statement)];
  },
};
