"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock3, Shield } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  investorCardClass,
  investorInputClass,
  investorLabelClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import {
  formatTimeUntilTradingStart,
  resolveJoinPageAggressivenessLabel,
  resolveJoinPageSecurityLabel,
  resolvePoolMaximumCapital,
  resolveTradingStartDate,
} from "@/features/marketplace/utils/join-pool-presentation";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplacePoolDetail } from "@/domain/marketplace/types";

const AGREEMENT = `By proceeding, you acknowledge that investing in trading pools involves substantial risk of loss. Past performance does not guarantee future results. RyvonX provides transparency tools but does not guarantee returns. You are investing based on your assessment of the Pool Manager's track record and RyvonX verification status.`;

/** Clears the fixed mobile bottom nav (+ safe area) so the final CTA can scroll fully into view. */
const MOBILE_SCROLL_FOOTER_CLASS =
  "pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-0";

interface JoinPoolConfirmationProps {
  pool: MarketplacePoolDetail;
  isAuthenticated: boolean;
  availableBalance?: number;
}

export function JoinPoolConfirmation({
  pool,
  isAuthenticated,
  availableBalance = 0,
}: JoinPoolConfirmationProps) {
  const router = useRouter();
  const maximumCapital = resolvePoolMaximumCapital(pool);
  const [amount, setAmount] = useState(String(pool.minInvestment));
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginUrl = `${ROUTES.login}?redirect=${encodeURIComponent(`${ROUTES.marketplace}/${pool.slug}/join`)}`;

  const poolOverview =
    pool.poolDescription?.trim() ||
    pool.description?.trim() ||
    pool.riskSummary?.trim() ||
    null;

  const timeUntilTrading = formatTimeUntilTradingStart(pool);
  const tradingStartDate = resolveTradingStartDate(pool);

  const joinDisabled =
    loading || pool.capacityStatus === "full" || pool.capacityStatus === "closed";

  const joinLabel = loading
    ? "Processing…"
    : pool.capacityStatus === "full"
      ? "Pool is full"
      : "Confirm & Join Pool";

  async function handleJoin() {
    if (!agreed) {
      setError("Please confirm the investment agreement.");
      return;
    }

    const num = Number(amount);
    if (!Number.isFinite(num) || num < pool.minInvestment) {
      setError(`Minimum investment is ${formatCurrency(pool.minInvestment)}.`);
      return;
    }

    if (maximumCapital != null && num > maximumCapital) {
      setError(`Maximum pool capacity is ${formatCurrency(maximumCapital)}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/investor/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundId: pool.id, amount: num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Join failed");
      router.push(`${ROUTES.investments}?joined=${pool.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join pool");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-2xl space-y-5 sm:space-y-8",
        MOBILE_SCROLL_FOOTER_CLASS
      )}
    >
      <Link
        href={`${ROUTES.marketplace}/${pool.slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-text)]"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to pool
      </Link>

      <div>
        <h1 className={cn(investorPageTitleClass, "text-[1.65rem] leading-tight sm:text-[1.85rem]")}>
          Confirm your investment
        </h1>
        <p className={cn(investorPageSubtitleClass, "text-[15px] leading-relaxed sm:text-sm")}>
          Review pool details and acknowledge risks before joining.
        </p>
      </div>

      <div className={cn(investorCardClass, "space-y-4 p-4 sm:space-y-5 sm:p-6")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">Pool</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-[var(--id-text)] sm:text-xl">{pool.name}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">Manager</p>
          <p className="mt-1 font-medium text-[var(--id-text)]">{pool.managerName}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4">
          <div>
            <p className="text-xs text-[var(--id-text-muted)] sm:text-sm">Minimum</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--id-text)] sm:text-base">
              {formatCurrency(pool.minInvestment)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--id-text-muted)] sm:text-sm">Maximum</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--id-text)] sm:text-base">
              {maximumCapital != null ? formatCurrency(maximumCapital) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--id-text-muted)] sm:text-sm">Security</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--id-text)] sm:text-base">
              {resolveJoinPageSecurityLabel(pool)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--id-text-muted)] sm:text-sm">Aggressiveness</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--id-text)] sm:text-base">
              {resolveJoinPageAggressivenessLabel(pool)}
            </p>
          </div>
        </div>
        {timeUntilTrading && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-3.5 py-3 sm:px-4">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--id-accent)]" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                Starts In
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--id-text)] sm:text-base">
                {timeUntilTrading}
              </p>
              {tradingStartDate && (
                <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                  Funding period ends{" "}
                  {new Date(tradingStartDate).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          </div>
        )}
        {poolOverview && (
          <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-3.5 sm:p-4">
            <div className="flex gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--id-accent)]" aria-hidden />
              <p className="text-sm leading-relaxed text-[var(--id-text)] sm:text-[15px]">{poolOverview}</p>
            </div>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div className={cn(investorCardClass, "border-[var(--id-accent)]/20 bg-[var(--id-accent-soft)] p-4 text-center sm:p-6")}>
          <p className="text-sm text-[var(--id-text-secondary)] sm:text-base">Sign in to complete your investment.</p>
          <Button asChild className="mt-4 h-12 w-full text-base sm:h-11 sm:w-auto sm:text-sm">
            <Link href={loginUrl}>Login or Register</Link>
          </Button>
        </div>
      ) : (
        <>
          <div>
            <label className={investorLabelClass}>Investment amount</label>
            <Input
              type="number"
              min={pool.minInvestment}
              max={maximumCapital ?? undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn("mt-1 h-11 text-base sm:h-10 sm:text-sm", investorInputClass)}
            />
            <p className="mt-1.5 text-xs text-[var(--id-text-muted)] sm:text-sm">
              Available balance: {formatCurrency(availableBalance)}
              {maximumCapital != null ? ` · Pool capacity: ${formatCurrency(maximumCapital)}` : ""}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 sm:p-5">
            <div className="flex gap-3 text-sm leading-relaxed text-[var(--id-text)] sm:text-[15px]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <p>{AGREEMENT}</p>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-[var(--id-text)]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--id-accent)]"
              />
              <span>I have read and agree to the investment agreement and risk disclosure.</span>
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-[var(--id-danger)]">{error}</p>
          )}

          <div className="scroll-mt-6 pt-1">
            <Button
              size="lg"
              className="h-12 w-full text-base sm:h-11 sm:text-sm"
              disabled={joinDisabled}
              onClick={handleJoin}
            >
              {joinLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
