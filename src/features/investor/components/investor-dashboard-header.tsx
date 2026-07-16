"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface InvestorDashboardHeaderProps {
  user: UserProfile;
  dailyProfit?: number;
  hasInvestments?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function InvestorDashboardHeader({
  user,
  dailyProfit = 0,
  hasInvestments = false,
}: InvestorDashboardHeaderProps) {
  const firstName = user.fullName.split(" ")[0] ?? user.fullName;
  const profitPositive = dailyProfit >= 0;
  const TrendIcon = profitPositive ? TrendingUp : TrendingDown;

  return (
    <header className="mb-6 sm:mb-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.65rem]">
            {getGreeting()}, {firstName}{" "}
            <span aria-hidden="true" className="inline-block">
              👋
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-[var(--id-text-secondary)]">
            {hasInvestments
              ? "Your investments are performing well today."
              : "Add funds to your wallet, then invest in a pool."}
          </p>
          <div className="mt-3 inline-flex items-center gap-2">
            <TrendIcon
              className={`h-3.5 w-3.5 ${
                profitPositive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
              }`}
              strokeWidth={2}
            />
            <span
              className={`text-sm font-semibold tabular-nums ${
                profitPositive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
              }`}
            >
              {profitPositive ? "+" : ""}
              {formatCurrency(dailyProfit)}
            </span>
            <span className="text-sm text-[var(--id-text-muted)]">
              Profit since yesterday
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            className="h-9 rounded-xl px-5 text-xs font-semibold text-white shadow-[var(--id-shadow)] [background:var(--id-accent-gradient)] hover:opacity-95"
          >
            <Link href={ROUTES.deposits}>
              <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Add Funds
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-xl border-[var(--id-border-strong)] bg-[var(--id-surface)] px-5 text-xs font-semibold text-[var(--id-text)] hover:bg-[var(--id-surface-hover)]"
          >
            <Link href={ROUTES.withdrawals}>
              <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Withdraw
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
