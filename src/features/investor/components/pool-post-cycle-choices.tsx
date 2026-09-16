"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CircleStop } from "lucide-react";
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
  hasActiveTradingCycle?: boolean;
  stopCopyingRequestedAt?: string | null;
  compact?: boolean;
}

export function PoolPostCycleChoices({
  fundId,
  capitalAmount,
  profitAmount,
  settlement,
  hasActiveTradingCycle = false,
  stopCopyingRequestedAt = null,
  compact = false,
}: PoolPostCycleChoicesProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const capitalPending =
    settlement != null &&
    settlement.principalAmount > 0 &&
    !settlement.capitalResolved;
  const profitPending = profitAmount > 0 && !(settlement?.profitResolved ?? false);
  const totalCopyingBalance = capitalAmount + profitAmount;

  if (!hasActiveTradingCycle && !capitalPending && !profitPending) {
    return null;
  }

  async function stopCopying() {
    setLoading("stop-copying");
    try {
      const res = await fetch(`/api/investor/pools/${fundId}/stop-copying`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(data.pending
        ? "Stop request received. This trader’s balance will move to your Funding Wallet when the active trading period closes."
        : `${formatCurrency(data.transferred ?? totalCopyingBalance)} moved to your Funding Wallet. Copying stopped.`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={cn("space-y-3", compact ? "" : "mt-4")}>
      <PostCycleRow
        label="Copying balance"
        amount={totalCopyingBalance}
        amountClassName="text-[var(--id-text)]"
        actions={
          <SimpleButton
            label={stopCopyingRequestedAt ? "Stop requested" : "Stop copying"}
            icon={CircleStop}
            variant="outline"
            loading={loading === "stop-copying"}
            disabled={Boolean(stopCopyingRequestedAt)}
            onClick={stopCopying}
          />
        }
      />
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
    hasActiveTradingCycle?: boolean;
    stopCopyingRequestedAt?: string | null;
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
      hasActiveTradingCycle={pool.hasActiveTradingCycle}
      stopCopyingRequestedAt={
        pool.hasActiveTradingCycle ? pool.stopCopyingRequestedAt : null
      }
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
  disabled = false,
  onClick,
  variant = "default",
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={loading || disabled}
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
