"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  InvestorInvestmentSummary,
  InvestorPoolPerformance,
} from "@/features/investor/types";

interface MobilePortfolioCardProps {
  investment: InvestorInvestmentSummary;
  performance: InvestorPoolPerformance;
}

/** Deterministic upward/downward micro-trend used only for the decorative graph. */
function MiniAreaChart({ positive }: { positive: boolean }) {
  const width = 120;
  const height = 56;

  const path = useMemo(() => {
    const points = positive
      ? [30, 34, 28, 38, 33, 44, 40, 50]
      : [46, 40, 44, 34, 38, 30, 32, 24];
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const coords = points.map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      line: `M ${coords.join(" L ")}`,
      area: `M 0,${height} L ${coords.join(" L ")} L ${width},${height} Z`,
    };
  }, [positive]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-28 shrink-0"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="mobilePortfolioFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill="url(#mobilePortfolioFill)" />
      <path
        d={path.line}
        fill="none"
        stroke="#a5b4fc"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MobilePortfolioCard({
  investment,
  performance,
}: MobilePortfolioCardProps) {
  const [hidden, setHidden] = useState(false);

  const availableBalance = investment.balance;
  const investedCapital = investment.participations.reduce(
    (sum, p) => sum + p.amountInvested,
    0
  );
  const portfolioValue = availableBalance + investedCapital;
  const todaysProfit = performance.dailyProfit ?? 0;
  const todaysProfitPct =
    portfolioValue > 0 ? (todaysProfit / portfolioValue) * 100 : 0;
  const positive = todaysProfit >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  const mask = (value: string) => (hidden ? "••••" : value);

  return (
    <article className="relative overflow-hidden rounded-2xl bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--id-text-muted)]">
            Portfolio Value
          </p>
          <p className="mt-1 font-mono text-[1.65rem] font-semibold leading-none tracking-tight text-[var(--id-text)] tabular-nums sm:text-[2rem]">
            {mask(formatCurrency(portfolioValue))}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5">
            <TrendIcon
              className={cn(
                "h-3.5 w-3.5",
                positive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
              )}
              strokeWidth={2}
            />
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                positive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
              )}
            >
              {positive ? "+" : ""}
              {formatCurrency(todaysProfit)} ({positive ? "+" : ""}
              {todaysProfitPct.toFixed(2)}%)
            </span>
            <span className="text-xs text-[var(--id-text-muted)]">Today</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => setHidden((v) => !v)}
            className="rounded-lg p-1 text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-text)]"
            aria-label={hidden ? "Show balances" : "Hide balances"}
          >
            {hidden ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
          <MiniAreaChart positive={positive} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--id-border)] pt-4">
        <div>
          <p className="text-xs text-[var(--id-text-muted)]">Available Balance</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--id-text)]">
            {mask(formatCurrency(availableBalance))}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--id-text-muted)]">Invested Capital</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--id-text)]">
            {mask(formatCurrency(investedCapital))}
          </p>
        </div>
      </div>
    </article>
  );
}
