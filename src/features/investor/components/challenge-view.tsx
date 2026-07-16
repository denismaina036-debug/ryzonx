"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { ChallengeEnrollment, TraderChallenge } from "@/features/investor/types";

interface ChallengeViewProps {
  challenge: TraderChallenge;
  enrollment: ChallengeEnrollment | null;
  availableBalance: number;
  /** When true, hides outer chrome for use inside Manager Journey step 5 */
  embedded?: boolean;
}

export function ChallengeView({
  challenge,
  enrollment,
  availableBalance,
  embedded = false,
}: ChallengeViewProps) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
      } else {
        toast.success("Payment received. Account details coming soon.");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const showCredentials =
    enrollment?.status === "active" &&
    (enrollment.challengeAccountDetails || enrollment.adminRules);

  const content = (
    <>
      {!embedded && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[var(--id-text)]">{challenge.title}</h2>
          <p className="mt-2 text-sm text-[var(--id-text-secondary)]">{challenge.description}</p>
        </div>
      )}

      <div
        className={cn(
          "space-y-5",
          !embedded &&
            "rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow-lg)]"
        )}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Price" value={formatCurrency(challenge.price)} />
          <Metric
            label="Profit target"
            value={`${challenge.profitTargetPct}%`}
            accent
          />
          <Metric label="Duration" value={`${challenge.durationDays} days`} />
        </div>

        {challenge.rulesSummary && (
          <p className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--id-text-secondary)]">
            {challenge.rulesSummary}
          </p>
        )}

        {showCredentials ? (
          <div className="space-y-4 border-t border-[var(--id-border)] pt-4">
            {enrollment.challengeAccountDetails && (
              <div className="rounded-xl border border-[var(--id-success)]/20 bg-[var(--id-success-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-success)]">
                  Evaluation account
                </p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-[var(--id-text)]">
                  {enrollment.challengeAccountDetails}
                </pre>
              </div>
            )}
            {enrollment.adminRules && (
              <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                  Rules from admin
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--id-text-secondary)]">
                  {enrollment.adminRules}
                </pre>
              </div>
            )}
          </div>
        ) : enrollment?.status === "awaiting_setup" ? (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-[var(--id-text-secondary)]">
            Payment received. Our team is preparing your trader evaluation account and will
            notify you when it is ready.
          </p>
        ) : enrollment?.status === "pending_payment" ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-[var(--id-text-secondary)]">
              Your crypto payment is pending. Complete your deposit to activate the evaluation.
            </p>
            <Button asChild variant="outline" className="border-[var(--id-border)]">
              <Link href={ROUTES.deposits}>Go to deposits</Link>
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className={cn(cryptoFlowPrimaryButtonClass, "w-full sm:w-auto")}
            onClick={() => setPayOpen(true)}
          >
            {challenge.buttonText}
          </Button>
        )}
      </div>

      {!embedded && (
        <Button
          asChild
          variant="outline"
          className="mt-6 border-[var(--id-border)] text-[var(--id-text-secondary)]"
        >
          <Link href={ROUTES.dashboard}>Back to Dashboard</Link>
        </Button>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="border-[var(--id-border)] bg-[var(--id-surface)] text-[var(--id-text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose payment method</DialogTitle>
            <DialogDescription className="text-[var(--id-text-muted)]">
              Pay {formatCurrency(challenge.price)} using your balance or deposit via crypto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={loading || availableBalance < challenge.price}
              onClick={() => handlePay("balance")}
              className="flex w-full flex-col rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-left transition-colors hover:border-[var(--id-accent)]/40 hover:bg-[var(--id-surface-hover)] disabled:opacity-50"
            >
              <span className="text-sm font-semibold text-[var(--id-text)]">
                Account balance
              </span>
              <span className="mt-1 text-xs text-[var(--id-text-muted)]">
                Available: {formatCurrency(availableBalance)}
              </span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePay("crypto")}
              className="flex w-full flex-col rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4 text-left transition-colors hover:border-[var(--id-accent)]/40 hover:bg-[var(--id-surface-hover)]"
            >
              <span className="text-sm font-semibold text-[var(--id-text)]">
                Deposit via crypto
              </span>
              <span className="mt-1 text-xs text-[var(--id-text-muted)]">
                Redirects to deposits — your journey continues after confirmation
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return content;

  return <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6 pb-24">{content}</div>;
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-xl font-semibold tabular-nums",
          accent ? "text-[var(--id-success)]" : "text-[var(--id-text)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
