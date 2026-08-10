"use client";

import { formatCurrency } from "@/lib/utils";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";
import { PoolPostCycleChoices } from "@/features/investor/components/pool-post-cycle-choices";

interface CycleSettlementChoicesProps {
  settlements: CycleInvestorSettlement[];
}

export function CycleSettlementChoices({ settlements }: CycleSettlementChoicesProps) {
  if (settlements.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-amber-200/80 bg-amber-50/60 shadow-[var(--id-shadow)] dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="border-b border-amber-200/80 px-5 py-4 sm:px-6 dark:border-amber-900/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">
          Action required
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">
          Completed cycles — choose what to do next
        </h2>
        <p className="mt-1 text-sm text-[var(--id-text-muted)]">
          These pools are not in an active trading cycle. Reinvest in the same pool, invest
          elsewhere, or transfer to your Funding Wallet.
        </p>
      </div>

      <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
        {settlements.map((settlement) => (
          <li key={settlement.id} className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--id-text)]">{settlement.poolName}</p>
                <p className="mt-0.5 text-sm text-[var(--id-text-muted)]">
                  {settlement.cycleName}
                  {settlement.cycleNumber != null ? ` · Cycle ${settlement.cycleNumber}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {settlement.principalAmount > 0 && (
                  <div>
                    <p className="font-mono font-semibold tabular-nums text-[var(--id-text)]">
                      {formatCurrency(settlement.principalAmount)}
                    </p>
                    <p className="text-xs text-[var(--id-text-muted)]">Capital</p>
                  </div>
                )}
                {settlement.profitAmount > 0 && (
                  <div>
                    <p className="font-mono font-semibold tabular-nums text-[var(--id-success)]">
                      +{formatCurrency(settlement.profitAmount)}
                    </p>
                    <p className="text-xs text-[var(--id-text-muted)]">Profit</p>
                  </div>
                )}
              </div>
            </div>

            <PoolPostCycleChoices settlement={settlement} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
