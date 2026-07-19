"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import { createAllocation } from "@/features/investor/components/investment/investor-allocation-api";
import {
  MarketplaceBreadcrumb,
  marketplaceHomeCrumb,
} from "@/features/marketplace/components/marketplace-breadcrumb";

export function AllocationCommitClient({
  cycle,
  strategy,
}: {
  cycle: InvestmentCycle;
  strategy: Strategy;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    cycle.minInvestment != null ? String(cycle.minInvestment) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ referenceNumber: string; amount: number } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Enter a valid allocation amount.");
      }
      const allocation = await createAllocation({
        investmentCycleId: cycle.id,
        amount: value,
      });
      setConfirmed({ referenceNumber: allocation.referenceNumber, amount: allocation.amount });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="text-2xl font-semibold text-[var(--id-text)]">Commitment Recorded</h1>
        <p className="text-sm text-[var(--id-text-muted)]">
          Your pending allocation has been recorded. No wallet debit occurred — this is a model
          commitment under the RyvonX investment cycle framework.
        </p>
        <dl className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 text-left text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-[var(--id-text-muted)]">Reference</dt>
            <dd className="font-mono font-medium">{confirmed.referenceNumber}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--id-text-muted)]">Amount</dt>
            <dd className="font-semibold">{formatCurrency(confirmed.amount)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--id-text-muted)]">Cycle</dt>
            <dd>{cycle.name}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--id-text-muted)]">Status</dt>
            <dd className="text-amber-600">Pending</dd>
          </div>
        </dl>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href={ROUTES.portfolio}>View portfolio</Link>
          </Button>
          <Button asChild className="[background:var(--id-accent-gradient)] text-white">
            <Link href={`${ROUTES.marketplaceCycles}/${cycle.slug}`}>Back to opportunity</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <MarketplaceBreadcrumb
        items={[
          marketplaceHomeCrumb(),
          { label: cycle.name, href: `${ROUTES.marketplaceCycles}/${cycle.slug}` },
          { label: "Commit" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-semibold text-[var(--id-text)]">Commit to Cycle</h1>
        <p className="mt-2 text-sm text-[var(--id-text-muted)]">
          {cycle.name} · {strategy.name}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]"
      >
        <div>
          <label htmlFor="amount" className="text-sm font-medium text-[var(--id-text)]">
            Allocation amount (USD)
          </label>
          <Input
            id="amount"
            type="number"
            min={cycle.minInvestment ?? 1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2"
            required
          />
          {cycle.minInvestment != null && (
            <p className="mt-1 text-xs text-[var(--id-text-muted)]">
              Minimum: {formatCurrency(cycle.minInvestment)}
            </p>
          )}
        </div>

        <p className="rounded-lg border border-[var(--id-border)] bg-[var(--id-bg)]/40 p-3 text-xs text-[var(--id-text-muted)]">
          This creates a pending allocation record only. Your wallet will not be debited and no deposit
          is required in this phase.
        </p>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button
          type="submit"
          disabled={loading || cycle.status !== "funding"}
          className="w-full rounded-xl [background:var(--id-accent-gradient)] text-white"
        >
          {loading ? "Recording…" : "Confirm commitment"}
        </Button>
      </form>
    </div>
  );
}
