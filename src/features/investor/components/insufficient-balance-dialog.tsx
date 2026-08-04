"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InsufficientBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  requiredAmount: number;
}

export function InsufficientBalanceDialog({
  open,
  onOpenChange,
  currentBalance,
  requiredAmount,
}: InsufficientBalanceDialogProps) {
  const shortfall = Math.max(0, requiredAmount - currentBalance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]">
            <Wallet className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle className="text-center">Insufficient balance</DialogTitle>
          <DialogDescription className="text-center">
            Your available balance is not enough to complete this investment. Add funds to your
            wallet and try again.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--id-text-muted)]">Current balance</dt>
            <dd className="font-mono font-semibold tabular-nums text-[var(--id-text)]">
              {formatCurrency(currentBalance)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--id-text-muted)]">Required amount</dt>
            <dd className="font-mono font-semibold tabular-nums text-[var(--id-text)]">
              {formatCurrency(requiredAmount)}
            </dd>
          </div>
          {shortfall > 0 && (
            <div className="flex items-center justify-between gap-4 border-t border-[var(--id-border)] pt-3">
              <dt className="text-[var(--id-text-muted)]">Additional funds needed</dt>
              <dd className="font-mono font-semibold tabular-nums text-[var(--id-danger)]">
                {formatCurrency(shortfall)}
              </dd>
            </div>
          )}
        </dl>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href={ROUTES.deposits}>Add Funds</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-[var(--id-border)]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function isInsufficientBalanceError(message: string): boolean {
  return /insufficient available balance/i.test(message);
}
