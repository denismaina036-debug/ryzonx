"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      throw new Error(data.error ?? "Request failed");
    }
    return data.settlement.id as string;
  }

  async function reinvestCapital() {
    setLoading("reinvest-capital");
    try {
      const settlementId = await resolveSettlementId();
      const res = await fetch(
        `/api/investor/cycle-settlements/${settlementId}/reinvest-capital`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(`${formatCurrency(capitalAmount)} reinvested in ${poolName}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function requestCapitalReturn() {
    setLoading("request-capital-return");
    try {
      const settlementId = await resolveSettlementId();
      const res = await fetch(
        `/api/investor/cycle-settlements/${settlementId}/request-capital-return`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success("Submitted for admin approval.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function transferProfit() {
    setLoading("transfer-profit");
    try {
      const settlementId = await resolveSettlementId();
      const res = await fetch(
        `/api/investor/cycle-settlements/${settlementId}/transfer-profit`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(`${formatCurrency(profitAmount)} moved to your Funding Wallet.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function reinvestProfit() {
    setLoading("reinvest-profit");
    try {
      const res = await fetch(`/api/investor/pools/${fundId}/reinvest-profit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: profitAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(`${formatCurrency(data.reinvested ?? profitAmount)} reinvested in ${poolName}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={cn("space-y-3", compact ? "" : "mt-4")}>
      {(capitalPending || capitalAwaitingAdmin) && (
        <PostCycleRow
          label="Capital"
          amount={capitalAmount}
          amountClassName="text-[var(--id-text)]"
          actions={
            capitalAwaitingAdmin ? (
              <span className="text-xs font-medium text-[var(--id-text-muted)]">
                Transfer pending approval
              </span>
            ) : (
              <>
                <SimpleButton
                  label="Reinvest in Pool"
                  icon={RefreshCw}
                  loading={loading === "reinvest-capital"}
                  onClick={reinvestCapital}
                />
                <SimpleButton
                  label="Transfer to Funding Wallet"
                  icon={ArrowDownToLine}
                  variant="outline"
                  loading={loading === "request-capital-return"}
                  onClick={requestCapitalReturn}
                />
              </>
            )
          }
        />
      )}

      {profitPending && (
        <PostCycleRow
          label="Profit"
          amount={profitAmount}
          prefix="+"
          amountClassName="text-[var(--id-success)]"
          actions={
            <>
              <SimpleButton
                label="Transfer to Funding Wallet"
                icon={ArrowDownToLine}
                loading={loading === "transfer-profit"}
                onClick={transferProfit}
              />
              <SimpleButton
                label="Reinvest in Pool"
                icon={RefreshCw}
                variant="outline"
                loading={loading === "reinvest-profit"}
                onClick={reinvestProfit}
              />
            </>
          }
        />
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

function PostCycleRow({
  label,
  amount,
  prefix = "",
  amountClassName,
  actions,
}: {
  label: string;
  amount: number;
  prefix?: string;
  amountClassName: string;
  actions: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
            {label}
          </p>
          <p className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", amountClassName)}>
            {prefix}
            {formatCurrency(amount)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}

function SimpleButton({
  label,
  icon: Icon,
  loading,
  onClick,
  variant = "default",
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={loading}
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl text-xs font-semibold",
        variant === "default" &&
          "text-white [background:var(--id-accent-gradient)] hover:opacity-95",
        variant === "outline" && "border-[var(--id-border)] bg-[var(--id-surface)]"
      )}
    >
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {loading ? "Processing…" : label}
    </Button>
  );
}
