"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CryptoFlowStep,
  cryptoFlowInputClass,
  cryptoFlowPrimaryButtonClass,
} from "@/features/investor/components/crypto-flow/crypto-flow-step";
import { formatCurrency } from "@/lib/utils";

interface InvestorWithdrawalsViewProps {
  availableBalance: number;
}

export function InvestorWithdrawalsView({
  availableBalance,
}: InvestorWithdrawalsViewProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = Number(amount);
  const amountValid =
    amount.trim() !== "" && Number.isFinite(parsed) && parsed > 0 && parsed <= availableBalance;
  const destinationValid = destination.trim().length >= 8;

  async function handleSubmit() {
    if (!amountValid) {
      toast.error("Enter a valid amount within your available balance");
      return;
    }
    if (!destinationValid) {
      toast.error("Enter a valid withdrawal destination");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/investor/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          destination: destination.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Submission failed");

      toast.success("Withdrawal request submitted", {
        description: "Our team will review and process your request.",
      });
      router.refresh();
      setAmount("");
      setDestination("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.85rem]">
          Withdraw Crypto
        </h1>
        <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
          Request a withdrawal from your available balance. All requests are reviewed by
          our team.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
        <CryptoFlowStep
          step={1}
          title="Funding Wallet"
          active={false}
          done
          summary={
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--id-accent-soft)]">
                <Wallet className="h-5 w-5 text-[var(--id-accent-text)]" />
              </span>
              <div>
                <p className="font-mono text-lg font-semibold tabular-nums text-[var(--id-text)]">
                  {formatCurrency(availableBalance)}
                </p>
                <p className="text-xs text-[var(--id-text-muted)]">Ready to withdraw</p>
              </div>
            </div>
          }
        />

        <CryptoFlowStep
          step={2}
          title="Withdrawal Amount"
          active={availableBalance > 0}
          done={amountValid}
          disabled={availableBalance <= 0}
          summary={
            amountValid && (
              <p className="font-mono text-sm font-semibold text-[var(--id-text)]">
                {formatCurrency(parsed)}
              </p>
            )
          }
        >
          <div className="space-y-3">
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in USD"
              className={cryptoFlowInputClass}
            />
            {amount.trim() !== "" && parsed > availableBalance && (
              <p className="text-xs text-[var(--id-danger)]">
                Amount exceeds available balance
              </p>
            )}
          </div>
        </CryptoFlowStep>

        <CryptoFlowStep
          step={3}
          title="Destination Address"
          active={availableBalance > 0 && amountValid}
          done={destinationValid}
          disabled={!amountValid || availableBalance <= 0}
          summary={
            destinationValid && (
              <p className="truncate font-mono text-xs text-[var(--id-text-secondary)]">
                {destination.trim()}
              </p>
            )
          }
        >
          <div className="space-y-3">
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Wallet address / bank account details"
              className={cryptoFlowInputClass}
            />
            <p className="text-xs leading-relaxed text-[var(--id-text-muted)]">
              Double-check your destination. Withdrawals to incorrect addresses cannot be
              reversed.
            </p>
          </div>
        </CryptoFlowStep>

        <CryptoFlowStep
          step={4}
          title="Confirm Withdrawal"
          active={amountValid && destinationValid}
          disabled={!amountValid || !destinationValid}
          isLast
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-sm">
              <div className="flex justify-between gap-4 py-1.5">
                <span className="text-[var(--id-text-muted)]">Amount</span>
                <span className="font-mono font-semibold text-[var(--id-text)]">
                  {amountValid ? formatCurrency(parsed) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-[var(--id-border)] py-1.5 pt-3">
                <span className="text-[var(--id-text-muted)]">Destination</span>
                <span className="max-w-[60%] truncate font-mono text-xs text-[var(--id-text)]">
                  {destination.trim() || "—"}
                </span>
              </div>
            </div>
            <Button
              className={cryptoFlowPrimaryButtonClass}
              disabled={submitting || !amountValid || !destinationValid}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : "Request Withdrawal"}
            </Button>
          </div>
        </CryptoFlowStep>
        </div>

        <aside className="h-fit rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">FAQ</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <Link
                href="/dashboard/transactions"
                className="flex items-center justify-between gap-2 text-sm text-[var(--id-text-secondary)] transition-colors hover:text-[var(--id-accent-text)]"
              >
                <span>Withdrawal processing time</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/transactions"
                className="flex items-center justify-between gap-2 text-sm text-[var(--id-text-secondary)] transition-colors hover:text-[var(--id-accent-text)]"
              >
                <span>Deposit &amp; withdrawal status</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            </li>
            <li>
              <span className="text-sm text-[var(--id-text-secondary)]">
                Withdrawals are reviewed manually for security.
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
