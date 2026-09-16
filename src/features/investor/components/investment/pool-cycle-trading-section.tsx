"use client";

import { formatCurrency } from "@/lib/utils";
import type { InvestorTradingCycleView } from "@/domain/investment/investor-presentation";
import { useCycleProgressLive } from "@/hooks/use-cycle-progress-live";
import { InvestorCycleTradeFeed } from "./investor-cycle-trade-feed";
import { formatCycleProfitSplit } from "@/domain/investment/profit-split";

export function PoolCycleTradingSection({ trading }: { trading: InvestorTradingCycleView }) {
  const { operations, isLive } = useCycleProgressLive({
    cycleId: trading.cycleId,
    cycleSlug: trading.cycleSlug,
    initialOperations: trading.initialOperations,
    enabled: true,
  });

  const liveTrading = operations.liveTrading;
  const cycleCapital = operations.portfolioProgress.raisedCapital;
  const copyingBalance =
    trading.investorAmount + (liveTrading?.investorProjectedProfit ?? 0);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
        <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-[var(--id-text)]">Copy activity</h2>
        </div>

        <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          <Metric label="Traded capital" value={formatCurrency(cycleCapital)} />
          <Metric label="Copying balance" value={formatCurrency(copyingBalance)} />
          <Metric
            label={trading.profitSplitTierName ? `${trading.profitSplitTierName} profit split` : "Profit split"}
            value={formatCycleProfitSplit(trading.profitSplit)}
          />
        </dl>

        <p className="border-t border-[var(--id-border)] px-5 py-3 text-xs text-[var(--id-text-muted)] sm:px-6">
          Your copying balance reflects your allocation plus your current share of recorded trade
          results. Final wallet movement remains protected by settlement controls.
        </p>
      </div>

      {operations.publicTrades.length === 0 ? (
        <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--id-text)]">No trades recorded yet</p>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">
            Strategy trader activity will appear here as trades are logged.
          </p>
        </div>
      ) : (
        <InvestorCycleTradeFeed
          trades={operations.publicTrades}
          live={isLive}
        />
      )}
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] px-4 py-3">
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd
        className="mt-1 text-sm font-semibold tabular-nums text-[var(--id-text)]"
      >
        {value}
      </dd>
    </div>
  );
}
