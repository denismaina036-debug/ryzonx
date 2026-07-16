import {
  Calendar,
  CircleDollarSign,
  Layers,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { InvestorInvestmentSummary } from "@/features/investor/types";

interface DashboardSummaryBarProps {
  investment: InvestorInvestmentSummary;
  trustScore?: number | null;
}

export function DashboardSummaryBar({
  investment,
  trustScore = null,
}: DashboardSummaryBarProps) {
  const totalInvested = investment.participations.reduce(
    (sum, p) => sum + p.amountInvested,
    0
  );
  const totalPools = investment.participations.length;
  const earliestStart = investment.participations
    .map((p) => p.investmentStartDate)
    .filter(Boolean)
    .sort()[0];

  const activeSince = earliestStart
    ? new Date(earliestStart).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const score = trustScore ?? 0;
  const badge =
    totalInvested <= 0
      ? null
      : score >= 80
        ? "Silver"
        : score >= 50
          ? "Bronze"
          : null;

  const items = [
    { icon: Wallet, label: "Funding Wallet", value: formatCurrency(investment.balance) },
    { icon: CircleDollarSign, label: "Total Invested", value: formatCurrency(totalInvested) },
    {
      icon: TrendingUp,
      label: "Pool Profit (in pools)",
      value: formatCurrency(investment.poolProfit),
      accent: investment.poolProfit !== 0,
    },
    { icon: Layers, label: "Total Pools", value: String(totalPools) },
    { icon: Calendar, label: "Active Since", value: activeSince },
    {
      icon: Shield,
      label: "RyvonX Trust Score",
      value: totalInvested > 0 ? `${score} / 100` : "—",
      badge,
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-4 shadow-[var(--id-shadow)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex min-w-0 items-center gap-3 sm:flex-1">
            <Icon
              className="h-4 w-4 shrink-0 text-[var(--id-text-muted)]"
              strokeWidth={1.75}
            />
            <div className="min-w-0">
              <p className="text-[10px] text-[var(--id-text-muted)]">{item.label}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    item.accent ? "text-[var(--id-success)]" : "text-[var(--id-text)]"
                  }`}
                >
                  {item.value}
                </p>
                {item.badge && (
                  <span className="rounded-full bg-[var(--id-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--id-text-secondary)]">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
