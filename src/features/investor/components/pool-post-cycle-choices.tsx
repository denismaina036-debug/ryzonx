"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Clock3, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";
import {
  resolvePostCycleCapitalAmount,
  resolvePostCycleProfitAmount,
} from "@/domain/investment/investor-pool-participation";

interface PoolPostCycleChoicesProps {
  fundId: string;
  poolName: string;
  capitalAmount: number;
  profitAmount: number;
  settlement: CycleInvestorSettlement | null;
  compact?: boolean;
}

export function PoolPostCycleChoices({
  fundId,
  poolName,
  capitalAmount,
  profitAmount,
  settlement,
  compact = false,
}: PoolPostCycleChoicesProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const capitalPending = capitalAmount > 0 && !(settlement?.capitalResolved ?? false);
  const profitPending = profitAmount > 0 && !(settlement?.profitResolved ?? false);
  const capitalAwaitingAdmin = settlement?.status === "capital_withdrawal_requested";

  if (!capitalPending && !profitPending && !capitalAwaitingAdmin) {
    return null;
  }

  async function resolveSettlementId(): Promise<string> {
    if (settlement?.id) return settlement.id;

    const res = await fetch(`/api/investor/pools/${fundId}/ensure-post-cycle-settlement`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok || !data.settlement?.id) {
      throw new Error(data.error ?? "Could not prepare your post-cycle options.");
    }
    return data.settlement.id as string;
  }

  async function runAction(
    action: "transfer-profit" | "reinvest-capital" | "request-capital-return",
    successMessage: string
  ) {
    setLoading(action);
    try {
      const settlementId = await resolveSettlementId();
      const res = await fetch(`/api/investor/cycle-settlements/${settlementId}/${action}`, {
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

  async function transferToFundingWallet() {
    setLoading("transfer-wallet");
    try {
      const settlementId = await resolveSettlementId();

      if (profitPending) {
        const profitRes = await fetch(
          `/api/investor/cycle-settlements/${settlementId}/transfer-profit`,
          { method: "POST" }
        );
        const profitData = await profitRes.json();
        if (!profitRes.ok) {
          throw new Error(profitData.error ?? "Profit transfer failed");
        }
      }

      if (capitalPending) {
        const capitalRes = await fetch(
          `/api/investor/cycle-settlements/${settlementId}/request-capital-return`,
          { method: "POST" }
        );
        const capitalData = await capitalRes.json();
        if (!capitalRes.ok) {
          throw new Error(capitalData.error ?? "Capital return request failed");
        }
        toast.success("Capital return submitted for admin approval.");
      } else if (profitPending) {
        toast.success(`${formatCurrency(profitAmount)} moved to your Funding Wallet.`);
      }

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
        compact ? "p-4" : "p-5"
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">
          No active trading cycle
        </p>
        <p className="text-sm text-[var(--id-text-muted)]">
          Choose what to do with your invested capital in {poolName}
          {profitPending ? " and any profit" : ""}.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {capitalPending && (
          <div>
            <p className="font-mono font-semibold tabular-nums text-[var(--id-text)]">
              {formatCurrency(capitalAmount)}
            </p>
            <p className="text-xs text-[var(--id-text-muted)]">Capital</p>
          </div>
        )}
        {profitPending && (
          <div>
            <p className="font-mono font-semibold tabular-nums text-[var(--id-success)]">
              +{formatCurrency(profitAmount)}
            </p>
            <p className="text-xs text-[var(--id-text-muted)]">Profit</p>
          </div>
        )}
      </div>

      {capitalAwaitingAdmin && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-3 text-sm text-[var(--id-text-muted)]">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          Capital return is pending admin approval.
        </div>
      )}

      {!capitalAwaitingAdmin && (capitalPending || profitPending) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {capitalPending && (
            <ActionButton
              icon={RefreshCw}
              label="Reinvest in this pool"
              hint="Next funding round"
              loading={loading === "reinvest-capital"}
              onClick={() =>
                runAction(
                  "reinvest-capital",
                  `${formatCurrency(capitalAmount)} reinvested in ${poolName}.`
                )
              }
            />
          )}
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
          <ActionButton
            icon={Wallet}
            label="Transfer to Funding Wallet"
            hint={
              capitalPending
                ? profitPending
                  ? "Profit now, capital after approval"
                  : "Admin approval required"
                : "Immediate"
            }
            variant="outline"
            loading={loading === "transfer-wallet"}
            onClick={transferToFundingWallet}
          />
        </div>
      )}
    </div>
  );
}

export function PoolPostCycleChoicesFromView({
  pool,
  compact = false,
}: {
  pool: {
    fundId: string;
    poolName: string;
    displayCapitalInvested: number;
    poolProfit: number;
    pendingSettlement: CycleInvestorSettlement | null;
  };
  compact?: boolean;
}) {
  return (
    <PoolPostCycleChoices
      fundId={pool.fundId}
      poolName={pool.poolName}
      capitalAmount={resolvePostCycleCapitalAmount({
        pendingSettlement: pool.pendingSettlement,
        displayCapitalInvested: pool.displayCapitalInvested,
      })}
      profitAmount={resolvePostCycleProfitAmount({
        pendingSettlement: pool.pendingSettlement,
        poolProfit: pool.poolProfit,
      })}
      settlement={pool.pendingSettlement}
      compact={compact}
    />
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
