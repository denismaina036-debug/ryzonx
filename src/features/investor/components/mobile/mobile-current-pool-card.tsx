"use client";

import Link from "next/link";
import { BadgeCheck, ChevronRight, Landmark } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  InvestorInvestmentSummary,
  InvestorPoolPerformance,
} from "@/features/investor/types";

interface MobileCurrentPoolCardProps {
  investment: InvestorInvestmentSummary;
  performance: InvestorPoolPerformance;
}

const HEALTH_LABELS = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
} as const;

export function MobileCurrentPoolCard({
  investment,
  performance,
}: MobileCurrentPoolCardProps) {
  const primary = investment.participations[0];
  const hasPool = Boolean(primary);

  if (!hasPool) {
    return (
      <Link
        href={ROUTES.marketplace}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--id-border-strong)] bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-[var(--id-accent-text)]">
          <Landmark className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[var(--id-text)]">
            No active pool
          </span>
          <span className="block text-xs text-[var(--id-text-muted)]">
            Explore the marketplace to start investing
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--id-text-muted)]" />
      </Link>
    );
  }

  const poolName = performance.poolName ?? primary?.poolName ?? "Active Pool";
  const myInvestment =
    performance.myInvestment ??
    investment.participations.reduce((sum, p) => sum + p.amountInvested, 0);
  const health = performance.poolHealth;
  const managerName = performance.managerName;
  const managerPhotoUrl = performance.managerPhotoUrl;
  const sharePct = performance.clientSharePct;

  return (
    <Link
      href={ROUTES.investments}
      className="block rounded-2xl bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)] transition-colors active:bg-[var(--id-surface-hover)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--id-text-muted)]">My Current Pool</p>
        <ChevronRight className="h-4 w-4 text-[var(--id-text-muted)]" />
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white">
          {poolName.charAt(0).toUpperCase()}
        </span>
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--id-text)]">
          {poolName}
        </p>
        {health && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              health === "healthy"
                ? "bg-[var(--id-success-soft)] text-[var(--id-success)]"
                : health === "watch"
                  ? "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                  : "bg-red-500/10 text-[var(--id-danger)]"
            )}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {HEALTH_LABELS[health]}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--id-border)] pt-3.5">
        <div className="min-w-0">
          <p className="text-[10px] text-[var(--id-text-muted)]">My Investment</p>
          <p className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
            {formatCurrency(myInvestment)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[var(--id-text-muted)]">My Share</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
            {sharePct.toFixed(2)}%
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[var(--id-text-muted)]">Manager</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <UserAvatar
              name={managerName ?? "Manager"}
              avatarUrl={managerPhotoUrl}
              className="h-5 w-5 rounded-full"
              fallbackClassName="text-[8px]"
            />
            <p className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-[var(--id-text)]">
              <span className="truncate">{managerName ?? "—"}</span>
              {managerName && (
                <BadgeCheck
                  className="h-3.5 w-3.5 shrink-0 text-[var(--id-accent)]"
                  strokeWidth={2}
                />
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
