"use client";

import { formatCurrency } from "@/lib/utils";
import type { InvestorTradingCycleView } from "@/domain/investment/investor-presentation";
import { useCycleProgressLive } from "@/hooks/use-cycle-progress-live";
import { InvestorCycleTradeFeed } from "./investor-cycle-trade-feed";
import { LiveTradingBadge } from "./live-trading-badge";

export function PoolCycleTradingSection({ trading }: { trading: InvestorTradingCycleView }) {
  const { operations, isLive } = useCycleProgressLive({
    cycleId: trading.cycleId,
    cycleSlug: trading.cycleSlug,
    initialOperations: trading.initialOperations,
    enabled: true,
  });

  const liveTrading = operations.liveTrading;
  const cycleCapital = operations.portfolioProgress.raisedCapital;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
        <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-accent)]">
                Trading Cycle
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">
                {trading.cycleName}
              </h2>
            </div>
            <LiveTradingBadge active={isLive} />
          </div>
        </div>

        <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <Metric label="Cycle capital" value={formatCurrency(cycleCapital)} />
          <Metric label="Your investment" value={formatCurrency(trading.investorAmount)} />
          <Metric
            label="Your share"
            value={
              liveTrading?.investorOwnershipPct != null
                ? `${liveTrading.investorOwnershipPct.toFixed(2)}%`
                : trading.ownershipSharePct != null
                  ? `${trading.ownershipSharePct.toFixed(2)}%`
                  : "—"
            }
          />
          <Metric
            label="Your projected profit"
            value={
              liveTrading?.investorProjectedProfit != null
                ? formatCurrency(liveTrading.investorProjectedProfit)
                : "—"
            }
            tone={
              liveTrading && (liveTrading.investorProjectedProfit ?? 0) > 0
                ? "positive"
                : liveTrading && (liveTrading.investorProjectedProfit ?? 0) < 0
                  ? "negative"
                  : undefined
            }
          />
        </dl>

        <p className="border-t border-[var(--id-border)] px-5 py-3 text-xs text-[var(--id-text-muted)] sm:px-6">
          Projected profit is an estimate before distribution. Wallet balances update after profit
          distribution.
        </p>
      </div>

      {operations.publicTrades.length === 0 ? (
        <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--id-text)]">No trades recorded yet</p>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">
            Pool manager activity will appear here as trades are logged.
          </p>
        </div>
      ) : (
        <InvestorCycleTradeFeed
          trades={operations.publicTrades}
          cycleStatus={operations.portfolioProgress.cycleStatus}
          live={isLive}
        />
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] px-4 py-3">
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd
        className={`mt-1 text-sm font-semibold tabular-nums ${
          tone === "positive"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "negative"
              ? "text-red-600 dark:text-red-400"
              : "text-[var(--id-text)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
