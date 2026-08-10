"use client";

import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";
import { PoolPostCycleChoicesFromView } from "@/features/investor/components/pool-post-cycle-choices";

interface CycleSettlementChoicesProps {
  settlements: CycleInvestorSettlement[];
}

export function CycleSettlementChoices({ settlements }: CycleSettlementChoicesProps) {
  if (settlements.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
      <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Completed Cycles</h2>
      </div>
      <ul className="divide-y divide-[var(--id-border)]">
        {settlements.map((settlement) => (
          <li key={settlement.id} className="space-y-4 px-5 py-5 sm:px-6">
            <div>
              <p className="font-semibold text-[var(--id-text)]">{settlement.poolName}</p>
              <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                {settlement.cycleName}
                {settlement.cycleNumber != null ? ` · Cycle ${settlement.cycleNumber}` : ""}
              </p>
            </div>
            <PoolPostCycleChoicesFromView
              pool={{
                fundId: settlement.fundId,
                poolName: settlement.poolName,
                displayCapitalInvested: settlement.principalAmount,
                poolProfit: settlement.profitAmount,
                pendingSettlement: settlement,
              }}
              compact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
