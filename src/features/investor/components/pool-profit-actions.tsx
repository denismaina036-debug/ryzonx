"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { investorInputClass } from "@/features/investor/constants/ui";
import { cn, formatCurrency } from "@/lib/utils";

type ProfitAction = "transfer" | "reinvest";

interface PoolProfitActionsProps {
  fundId: string;
  poolName: string;
  availableProfit: number;
  compact?: boolean;
}

export function PoolProfitActions({
  fundId,
  poolName,
  availableProfit,
  compact = false,
}: PoolProfitActionsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<ProfitAction>("transfer");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (availableProfit <= 0) {
    return compact ? null : (
      <p className="text-sm text-[var(--id-text-muted)]">
        Pool profit will appear here when trades are recorded on your allocation.
      </p>
    );
  }

  const profitPositive = availableProfit >= 0;

  function openDialog(nextAction: ProfitAction) {
    setAction(nextAction);
    setAmount(String(Math.round(availableProfit * 100) / 100));
    setDialogOpen(true);
  }

  async function handleConfirm() {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (num > availableProfit + 0.005) {
      toast.error(`Maximum available profit is ${formatCurrency(availableProfit)}.`);
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        action === "transfer"
          ? `/api/investor/pools/${fundId}/transfer-profit`
          : `/api/investor/pools/${fundId}/reinvest-profit`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      setDialogOpen(false);
      if (action === "transfer") {
        toast.success(
          `${formatCurrency(data.transferred ?? num)} moved to your Funding Wallet.`
        );
      } else {
        toast.success(
          `${formatCurrency(data.reinvested ?? num)} reinvested in ${poolName}.`
        );
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]",
          compact ? "p-4" : "p-5"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
              Available Pool Profit
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-xl font-semibold tabular-nums",
                profitPositive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
              )}
            >
              {profitPositive && availableProfit > 0 ? "+" : ""}
              {formatCurrency(availableProfit)}
            </p>
            <p className="mt-1 text-xs text-[var(--id-text-faint)]">
              Profit stays in the pool until you transfer or reinvest.
            </p>
          </div>
          {!compact && (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--id-success-soft)] text-[var(--id-success)]">
              <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold text-white [background:var(--id-accent-gradient)] hover:opacity-95"
            onClick={() => openDialog("transfer")}
          >
            <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
            Transfer to Funding Wallet
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-xl border-[var(--id-border)] bg-[var(--id-surface)] text-xs font-semibold"
            onClick={() => openDialog("reinvest")}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reinvest in Pool
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[var(--id-border)] bg-[var(--id-surface)] text-[var(--id-text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "transfer" ? "Transfer pool profit" : "Reinvest pool profit"}
            </DialogTitle>
            <DialogDescription className="text-[var(--id-text-muted)]">
              {action === "transfer"
                ? `Move profit from ${poolName} into your Funding Wallet for withdrawals or new investments.`
                : `Add profit from ${poolName} back to your invested capital in this pool.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                Amount
              </label>
              <Input
                type="number"
                min={0.01}
                max={availableProfit}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={investorInputClass}
              />
              <p className="mt-1.5 text-xs text-[var(--id-text-faint)]">
                Available: {formatCurrency(availableProfit)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-[var(--id-border)]"
                onClick={() => setAmount(String(availableProfit))}
              >
                Use full amount
              </Button>
            </div>

            <Button
              type="button"
              className="w-full rounded-xl text-white [background:var(--id-accent-gradient)] hover:opacity-95"
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading
                ? "Processing…"
                : action === "transfer"
                  ? "Confirm transfer"
                  : "Confirm reinvest"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
