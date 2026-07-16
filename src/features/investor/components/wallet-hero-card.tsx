"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  EyeOff,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";
import { WalletSparkline } from "@/features/investor/components/wallet-sparkline";
import type { InvestorInvestmentSummary } from "@/features/investor/types";

interface WalletHeroCardProps {
  investment: InvestorInvestmentSummary;
}

export function WalletHeroCard({ investment }: WalletHeroCardProps) {
  const [balanceHidden, setBalanceHidden] = useState(false);

  const totalInvested = investment.participations.reduce(
    (sum, p) => sum + p.amountInvested,
    0
  );
  const primaryPool = investment.participations[0];
  const availableBalance = investment.balance;

  function formatTermDate(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function investmentDurationDays() {
    if (!primaryPool?.investmentStartDate) return "—";
    const start = new Date(primaryPool.investmentStartDate);
    const days = Math.max(
      0,
      Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${days} Days`;
  }

  const mask = (value: string) => (balanceHidden ? "••••••" : value);

  return (
    <article className="relative overflow-hidden rounded-[var(--id-radius)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
      <div className="relative px-6 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[var(--id-text)]">Funding Wallet</p>
          <button
            type="button"
            onClick={() => setBalanceHidden((v) => !v)}
            className="rounded-lg p-1.5 text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-text)]"
            aria-label={balanceHidden ? "Show balance" : "Hide balance"}
          >
            {balanceHidden ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--id-text-muted)]">Available for investing & withdrawals</p>
            <p className="mt-1.5 font-mono text-[2rem] font-semibold leading-none tracking-tight text-[var(--id-text)] tabular-nums sm:text-[2.25rem]">
              {mask(formatCurrency(availableBalance))}
            </p>
          </div>
          {totalInvested > 0 || availableBalance !== 0 ? (
            <WalletSparkline className="h-14 w-28 shrink-0 sm:h-16 sm:w-36" />
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--id-border)] pt-5">
          <WalletMeta
            label="Invested Capital"
            value={mask(formatCurrency(totalInvested))}
          />
          <WalletMeta label="Investment Duration" value={investmentDurationDays()} />
          <WalletMeta
            label="Matures On"
            value={formatTermDate(primaryPool?.termEndDate ?? null)}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button
            asChild
            className="h-10 rounded-xl px-5 text-xs font-semibold text-white shadow-[var(--id-shadow-lg)] [background:var(--id-accent-gradient)] hover:opacity-95"
          >
            <Link href={ROUTES.deposits}>
              <ArrowDownToLine className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Add Funds
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-[var(--id-border-strong)] bg-[var(--id-surface-muted)] px-5 text-xs font-semibold text-[var(--id-text)] hover:bg-[var(--id-surface-hover)]"
          >
            <Link href={ROUTES.marketplace}>
              <Landmark className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Invest
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-10 rounded-xl px-5 text-xs font-semibold text-[var(--id-text-secondary)] hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
          >
            <Link href={ROUTES.withdrawals}>
              <ArrowUpFromLine className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Withdraw
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function WalletMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-[var(--id-text-muted)]">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-medium tabular-nums text-[var(--id-text)] sm:text-sm">
        {value}
      </p>
    </div>
  );
}

export const InvestmentSummaryCard = WalletHeroCard;
