"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cryptoFlowPrimaryButtonClass } from "@/features/investor/components/crypto-flow/crypto-flow-step";
import { investorCardElevatedClass } from "@/features/investor/constants/ui";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { ChallengeEnrollment, TraderChallenge } from "@/features/investor/types";

interface StickyChallengeBarProps {
  challenge: TraderChallenge | null;
  enrollment: ChallengeEnrollment | null;
  availableBalance?: number;
}

export function StickyChallengeBar({
  challenge,
  enrollment,
  availableBalance = 0,
}: StickyChallengeBarProps) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!challenge?.isActive || dismissed) return null;

  const isAwaiting =
    enrollment?.status === "awaiting_setup" || enrollment?.status === "paid";

  const isActive = enrollment?.status === "active";

  async function handlePay(method: "balance" | "crypto") {
    setLoading(true);
    try {
      const res = await fetch("/api/investor/challenge/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");

      setPayOpen(false);
      if (data.redirectTo) {
        router.push(data.redirectTo);
        toast.message("Complete your crypto deposit to open the challenge.");
      } else {
        toast.success("Challenge fee paid. Our team will send your account details soon.");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:left-64 lg:pb-4 xl:left-[17rem]">
        <div
          className={cn(
            investorCardElevatedClass,
            "pointer-events-auto flex w-full max-w-4xl items-center gap-3 border-amber-500/20 bg-[var(--id-glass)] p-3 backdrop-blur-xl sm:gap-4 sm:p-4"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30">
            <Trophy className="h-5 w-5 text-amber-500" strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--id-text)]">
              {challenge.title}
            </p>
            <p className="truncate text-xs text-[var(--id-text-muted)]">
              {isActive
                ? "Your evaluation is active — view credentials"
                : isAwaiting
                  ? "Payment received — account details coming soon"
                  : `${formatCurrency(challenge.price)} · ${challenge.profitTargetPct}% profit target`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isActive ? (
              <Button asChild size="sm" className="rounded-full">
                <Link href={ROUTES.managerJourney}>View Journey</Link>
              </Button>
            ) : isAwaiting ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full border-[var(--id-border)]"
              >
                <Link href={ROUTES.managerJourney}>Status</Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className={cn(cryptoFlowPrimaryButtonClass, "rounded-full px-4")}
                onClick={() => setPayOpen(true)}
              >
                {challenge.buttonText}
              </Button>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg p-1.5 text-[var(--id-text-faint)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text-muted)]"
              aria-label="Dismiss challenge bar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="border-[var(--id-border)] bg-[var(--id-surface)] text-[var(--id-text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue Manager Journey</DialogTitle>
            <DialogDescription className="text-[var(--id-text-muted)]">
              Pay {formatCurrency(challenge.price)} to proceed. After payment, our team will
              send your evaluation account and rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={loading || availableBalance < challenge.price}
              onClick={() => handlePay("balance")}
              className="flex w-full flex-col rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-left transition-colors hover:border-[var(--id-accent)]/40 hover:bg-[var(--id-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm font-semibold text-[var(--id-text)]">
                Pay from balance
              </span>
              <span className="mt-1 text-xs text-[var(--id-text-muted)]">
                Available: {formatCurrency(availableBalance)}
                {availableBalance < challenge.price && " — insufficient, add funds first"}
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handlePay("crypto")}
              className="flex w-full flex-col rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-left transition-colors hover:border-[var(--id-accent)]/40 hover:bg-[var(--id-surface-hover)] disabled:opacity-50"
            >
              <span className="text-sm font-semibold text-[var(--id-text)]">
                Deposit via crypto
              </span>
              <span className="mt-1 text-xs text-[var(--id-text-muted)]">
                You&apos;ll be taken to deposits — challenge opens after admin confirms
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
