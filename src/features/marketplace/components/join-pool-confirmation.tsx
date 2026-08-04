"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  investorInputClass,
  investorLabelClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import { resolvePoolMaximumCapital } from "@/features/marketplace/utils/join-pool-presentation";
import { LiveRoiPreview, RoiDisclaimerBlock } from "@/features/roi/components/live-roi-preview";
import {
  InsufficientBalanceDialog,
  isInsufficientBalanceError,
} from "@/features/investor/components/insufficient-balance-dialog";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplacePoolDetail } from "@/domain/marketplace/types";

const AGREEMENT = `By proceeding, you acknowledge that investing in trading pools involves substantial risk of loss. Past performance does not guarantee future results. RyvonX provides transparency tools but does not guarantee returns. You are investing based on your assessment of the Pool Manager's track record and RyvonX verification status.`;

const MOBILE_SCROLL_FOOTER_CLASS =
  "pb-[calc(var(--mobile-fab-offset)+2.5rem+env(safe-area-inset-bottom))] sm:pb-0";

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
  const [insufficientBalanceOpen, setInsufficientBalanceOpen] = useState(false);
  const [insufficientRequiredAmount, setInsufficientRequiredAmount] = useState(0);

  const loginUrl = `${ROUTES.login}?redirect=${encodeURIComponent(`${ROUTES.marketplace}/${pool.slug}/join`)}`;

  const joinDisabled =
    loading || pool.capacityStatus === "full" || pool.capacityStatus === "closed";

  const joinLabel = loading
    ? "Processing…"
    : pool.capacityStatus === "full"
      ? "Pool is full"
      : "Confirm Investment";

  const parsedAmount = useMemo(() => {
    const num = Number(amount);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [amount]);

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

    if (num > availableBalance) {
      setInsufficientRequiredAmount(num);
      setInsufficientBalanceOpen(true);
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
      const message = err instanceof Error ? err.message : "Could not join pool";
      if (isInsufficientBalanceError(message)) {
        setInsufficientRequiredAmount(num);
        setInsufficientBalanceOpen(true);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-xl space-y-6 sm:space-y-8",
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
          Invest in {pool.displayPoolName || pool.name}
        </h1>
        <p className={cn(investorPageSubtitleClass, "text-[15px] leading-relaxed sm:text-sm")}>
          Enter your amount, review projected returns, and confirm.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-xl border border-[var(--id-accent)]/20 bg-[var(--id-accent-soft)] p-5 text-center sm:p-6">
          <p className="text-sm text-[var(--id-text-secondary)] sm:text-base">
            Sign in to complete your investment.
          </p>
          <Button asChild className="mt-4 h-12 w-full text-base sm:h-11 sm:w-auto sm:text-sm">
            <Link href={loginUrl}>Login or Register</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className={investorLabelClass}>Investment amount</label>
            <Input
              type="number"
              min={pool.minInvestment}
              max={maximumCapital ?? undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn("mt-1 h-11 text-base sm:h-10 sm:text-sm", investorInputClass)}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-[var(--id-text-muted)] sm:text-sm">
              Min {formatCurrency(pool.minInvestment)}
              {maximumCapital != null ? ` · Max ${formatCurrency(maximumCapital)}` : ""}
              {" · "}
              Available {formatCurrency(availableBalance)}
            </p>
          </div>

          <LiveRoiPreview
            amount={parsedAmount}
            levels={pool.investmentLevels}
            multipliers={pool.roiMultipliers}
            returnDurationPreset={pool.returnDurationPreset}
            returnDurationValue={pool.returnDurationValue}
            returnDurationUnit={pool.returnDurationUnit}
          />

          <RoiDisclaimerBlock />

          <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 sm:p-5">
            <div className="flex gap-3 text-sm leading-relaxed text-[var(--id-text)] sm:text-[15px]">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
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
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-[var(--id-danger)]">
              {error}
            </p>
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
        </div>
      )}

      <InsufficientBalanceDialog
        open={insufficientBalanceOpen}
        onOpenChange={setInsufficientBalanceOpen}
        currentBalance={availableBalance}
        requiredAmount={insufficientRequiredAmount}
      />
    </div>
  );
}
