"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Shield } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  AGGRESSIVENESS_LABELS,
  SECURITY_RATING_LABELS,
} from "@/constants/marketplace";
import {
  investorCardClass,
  investorInputClass,
  investorLabelClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplacePoolDetail } from "@/domain/marketplace/types";

const AGREEMENT = `By proceeding, you acknowledge that investing in trading pools involves substantial risk of loss. Past performance does not guarantee future results. RyvonX provides transparency tools but does not guarantee returns. You are investing based on your assessment of the Pool Manager's track record and RyvonX verification status.`;

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
  const [amount, setAmount] = useState(String(pool.suggestedInvestment));
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginUrl = `${ROUTES.login}?redirect=${encodeURIComponent(`${ROUTES.marketplace}/${pool.slug}/join`)}`;

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
    <div className="mx-auto max-w-2xl space-y-8">
      <Link
        href={`${ROUTES.marketplace}/${pool.slug}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pool
      </Link>

      <div>
        <h1 className={investorPageTitleClass}>Confirm your investment</h1>
        <p className={investorPageSubtitleClass}>
          Review pool details and acknowledge risks before joining.
        </p>
      </div>

      <div className={cn(investorCardClass, "space-y-4 p-6")}>
        <div>
          <p className="text-sm text-[var(--id-text-faint)]">Pool</p>
          <p className="text-lg font-semibold text-[var(--id-text)]">{pool.name}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--id-text-faint)]">Manager</p>
          <p className="font-medium text-[var(--id-text)]">{pool.managerName}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--id-text-faint)]">Minimum</p>
            <p className="font-semibold text-[var(--id-text)]">{formatCurrency(pool.minInvestment)}</p>
          </div>
          <div>
            <p className="text-[var(--id-text-faint)]">Suggested</p>
            <p className="font-semibold text-[var(--id-text)]">{formatCurrency(pool.suggestedInvestment)}</p>
          </div>
          <div>
            <p className="text-[var(--id-text-faint)]">Security</p>
            <p className="font-semibold text-[var(--id-text)]">
              {pool.securityRating ? SECURITY_RATING_LABELS[pool.securityRating] : "—"}
            </p>
          </div>
          <div>
            <p className="text-[var(--id-text-faint)]">Aggressiveness</p>
            <p className="font-semibold text-[var(--id-text)]">
              {pool.aggressivenessLevel
                ? AGGRESSIVENESS_LABELS[pool.aggressivenessLevel]
                : "—"}
            </p>
          </div>
        </div>
        {pool.poolDurationDays && (
          <p className="text-sm text-[var(--id-text-muted)]">
            Expected duration: {pool.poolDurationDays} days
          </p>
        )}
        {pool.riskSummary && (
          <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            {pool.riskSummary}
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div className={cn(investorCardClass, "border-[var(--id-accent)]/20 bg-[var(--id-accent-soft)] p-6 text-center")}>
          <p className="text-[var(--id-text-secondary)]">Sign in to complete your investment.</p>
          <Button asChild className="mt-4">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn("mt-1", investorInputClass)}
            />
            <p className="mt-1 text-xs text-[var(--id-text-faint)]">
              Available balance: {formatCurrency(availableBalance)}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
            <div className="flex gap-2 text-sm text-[var(--id-text-secondary)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>{AGREEMENT}</p>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-[var(--id-text)]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span>I have read and agree to the investment agreement and risk disclosure.</span>
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-[var(--id-danger)]">{error}</p>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={loading || pool.capacityStatus === "full" || pool.capacityStatus === "closed"}
            onClick={handleJoin}
          >
            {loading
              ? "Processing…"
              : pool.capacityStatus === "full"
                ? "Pool is full"
                : "Confirm & Join Pool"}
          </Button>
        </>
      )}
    </div>
  );
}
