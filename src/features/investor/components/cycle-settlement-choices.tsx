"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Clock3,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";

interface CycleSettlementChoicesProps {
  settlements: CycleInvestorSettlement[];
}

export function CycleSettlementChoices({ settlements }: CycleSettlementChoicesProps) {
  if (settlements.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-amber-200/80 bg-amber-50/60 shadow-[var(--id-shadow)] dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="border-b border-amber-200/80 px-5 py-4 sm:px-6 dark:border-amber-900/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">
          Action required
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">
          Completed cycle — choose what to do next
        </h2>
        <p className="mt-1 text-sm text-[var(--id-text-muted)]">
          Capital is not reinvested automatically. Transfer profit immediately, reinvest capital in
          the next funding round, request capital return to your Funding Wallet, or invest elsewhere.
        </p>
      </div>

      <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
        {settlements.map((settlement) => (
          <CycleSettlementCard key={settlement.id} settlement={settlement} />
        ))}
      </ul>
    </section>
  );
}

function CycleSettlementCard({ settlement }: { settlement: CycleInvestorSettlement }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const profitPending = settlement.profitAmount > 0 && !settlement.profitResolved;
  const capitalPending = settlement.principalAmount > 0 && !settlement.capitalResolved;
  const capitalAwaitingAdmin = settlement.status === "capital_withdrawal_requested";

  async function runAction(
    action: "transfer-profit" | "reinvest-capital" | "request-capital-return",
    successMessage: string
  ) {
    setLoading(action);
    try {
      const res = await fetch(`/api/investor/cycle-settlements/${settlement.id}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(successMessage);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <li className="space-y-4 px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--id-text)]">{settlement.poolName}</p>
          <p className="mt-0.5 text-sm text-[var(--id-text-muted)]">
            {settlement.cycleName}
            {settlement.cycleNumber != null ? ` · Cycle ${settlement.cycleNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {settlement.principalAmount > 0 && (
            <div>
              <p className="font-mono font-semibold tabular-nums text-[var(--id-text)]">
                {formatCurrency(settlement.principalAmount)}
              </p>
              <p className="text-xs text-[var(--id-text-muted)]">Capital</p>
            </div>
          )}
          {settlement.profitAmount > 0 && (
            <div>
              <p className="font-mono font-semibold tabular-nums text-[var(--id-success)]">
                +{formatCurrency(settlement.profitAmount)}
              </p>
              <p className="text-xs text-[var(--id-text-muted)]">Profit</p>
            </div>
          )}
        </div>
      </div>

      {capitalAwaitingAdmin && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-3 text-sm text-[var(--id-text-muted)]">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          Capital return is pending admin approval. Profit actions remain available below.
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {profitPending && (
          <ActionButton
            icon={ArrowDownToLine}
            label="Transfer profit to Funding Wallet"
            hint="Immediate"
            loading={loading === "transfer-profit"}
            onClick={() =>
              runAction(
                "transfer-profit",
                `${formatCurrency(settlement.profitAmount)} moved to your Funding Wallet.`
              )
            }
          />
        )}

        {capitalPending && !capitalAwaitingAdmin && (
          <>
            <ActionButton
              icon={RefreshCw}
              label="Reinvest in this pool"
              hint="Goes to open funding cycle"
              loading={loading === "reinvest-capital"}
              onClick={() =>
                runAction(
                  "reinvest-capital",
                  `${formatCurrency(settlement.principalAmount)} reinvested in ${settlement.poolName}.`
                )
              }
            />
            <ActionButton
              icon={Wallet}
              label="Return capital to Funding Wallet"
              hint="Admin approval required"
              variant="outline"
              loading={loading === "request-capital-return"}
              onClick={() =>
                runAction(
                  "request-capital-return",
                  "Capital return submitted for admin approval."
                )
              }
            />
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-16 flex-col items-start gap-1 rounded-xl border-[var(--id-border)] px-4 py-3 text-left"
            >
              <Link href={ROUTES.marketplace}>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--id-text)]">
                  <ArrowRightLeft className="h-4 w-4" />
                  Invest in another pool
                </span>
                <span className="text-xs font-normal text-[var(--id-text-muted)]">
                  Browse marketplace
                </span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function ActionButton({
  icon: Icon,
  label,
  hint,
  loading,
  onClick,
  variant = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  loading: boolean;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      disabled={loading}
      onClick={onClick}
      className={cn(
        "h-auto min-h-16 flex-col items-start gap-1 rounded-xl px-4 py-3 text-left",
        variant === "default" &&
          "text-white [background:var(--id-accent-gradient)] hover:opacity-95"
      )}
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {loading ? "Processing…" : label}
      </span>
      <span
        className={cn(
          "text-xs font-normal",
          variant === "default" ? "text-white/85" : "text-[var(--id-text-muted)]"
        )}
      >
        {hint}
      </span>
    </Button>
  );
}
