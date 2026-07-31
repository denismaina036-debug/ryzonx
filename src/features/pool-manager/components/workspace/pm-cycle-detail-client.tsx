"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChevronLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  INVESTMENT_CYCLE_MANAGER_TRANSITIONS,
  INVESTMENT_CYCLE_STATUS_LABELS,
} from "@/constants/investment-cycle";
import { INVESTMENT_ALLOCATION_STATUS_LABELS } from "@/constants/investment-allocation";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CycleParticipantView, InvestmentCycle, Strategy } from "@/domain/investment/types";
import {
  pmAccentButtonClass,
  pmCardClass,
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
  pmStatLabelClass,
  pmStatValueClass,
  pmSubtitleClass,
} from "@/features/pool-manager/constants/ui";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import {
  fetchCycleParticipants,
  submitCycle,
  transitionCycle,
} from "./pm-api";

export function PmCycleDetailClient({
  initialCycle,
  strategy,
}: {
  initialCycle: InvestmentCycle;
  strategy: Strategy | null;
  strategies: Strategy[];
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState(initialCycle);
  const [participants, setParticipants] = useState<CycleParticipantView[]>([]);
  const [openTradeCount, setOpenTradeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const managerTransitions = INVESTMENT_CYCLE_MANAGER_TRANSITIONS[cycle.status] ?? [];
  const canCloseCycle =
    cycle.status === "trading" && openTradeCount === 0 && managerTransitions.includes("distribution");
  const profitTone =
    cycle.currentCycleProfit > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : cycle.currentCycleProfit < 0
        ? "text-red-600 dark:text-red-400"
        : undefined;

  useEffect(() => {
    void fetchCycleParticipants(cycle.id)
      .then(setParticipants)
      .catch(() => setParticipants([]));
  }, [cycle.id]);

  useEffect(() => {
    if (cycle.status !== "trading") {
      setOpenTradeCount(0);
      return;
    }
    void fetch(`/api/pool-manager/investment-cycles/${cycle.id}/journal`)
      .then((res) => res.json())
      .then((data: { entries?: Array<{ status: string }> }) => {
        const open = (data.entries ?? []).filter(
          (e) => e.status === "open" || e.status === "partially_closed"
        );
        setOpenTradeCount(open.length);
      })
      .catch(() => setOpenTradeCount(0));
  }, [cycle.id, cycle.status]);

  const runAction = useCallback(
    async (action: () => Promise<InvestmentCycle>, success: string) => {
      setLoading(true);
      setMessage(null);
      try {
        const next = await action();
        setCycle(next);
        setMessage({ text: success, variant: "success" });
        router.refresh();
      } catch (err) {
        setMessage({
          text: err instanceof Error ? err.message : "Action failed",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const journalHref = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}/journal`;

  return (
    <div className="space-y-6">
      <PmPageHeader
        eyebrow="Investment Cycle"
        title={cycle.name}
        description="Cycle performance and participants"
        actions={
          <PmStatusBadge
            label={INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
            status={cycle.status}
          />
        }
      />

      <PmFormMessage message={message?.text ?? null} variant={message?.variant ?? "info"} />

      <section className={cn(pmCardClass, "p-4 sm:p-5")}>
        <p className={pmStatLabelClass}>Cycle actions</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {cycle.status === "draft" && (
            <ActionButton
              disabled={loading}
              variant="primary"
              onClick={() => runAction(() => submitCycle(cycle.id), "Submitted for review")}
            >
              Submit for Review
            </ActionButton>
          )}

          {(cycle.status === "approved" || cycle.status === "funding") && (
            <ActionButton
              disabled={loading}
              variant="success"
              onClick={() =>
                runAction(async () => {
                  const next = await transitionCycle(cycle.id, "trading");
                  router.push(journalHref);
                  return next;
                }, "Trading started")
              }
            >
              Start Trading
            </ActionButton>
          )}

          {canCloseCycle && (
            <ActionButton
              disabled={loading}
              variant="danger"
              onClick={() =>
                runAction(
                  () => transitionCycle(cycle.id, "distribution"),
                  "Investment cycle closed — distribution started"
                )
              }
            >
              Close Investment Cycle
            </ActionButton>
          )}

          {cycle.status === "trading" && openTradeCount > 0 && (
            <p className="self-center text-sm text-amber-700 dark:text-amber-300">
              Close all {openTradeCount} open trade{openTradeCount === 1 ? "" : "s"} before closing the cycle.
            </p>
          )}

          {["trading", "distribution", "completed", "archived"].includes(cycle.status) && (
            <ActionButton asChild variant="accent">
              <Link href={journalHref}>
                <BookOpen className="h-4 w-4" />
                Trading Journal
              </Link>
            </ActionButton>
          )}

          {strategy && (
            <ActionButton asChild variant="secondary">
              <Link href={`${ROUTES.poolManagerStrategies}/${strategy.id}`}>View Strategy</Link>
            </ActionButton>
          )}

          <ActionButton asChild variant="secondary">
            <Link href={ROUTES.poolManagerInvestmentCycles}>
              <ChevronLeft className="h-4 w-4" />
              All Cycles
            </Link>
          </ActionButton>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total profit recorded"
          value={formatCurrency(cycle.currentCycleProfit)}
          valueClassName={profitTone}
          hint="Realized P&L from closed trades"
        />
        <StatCard
          label="Raised capital"
          value={formatCurrency(cycle.raisedCapital)}
          hint={`${cycle.investorCount} investor${cycle.investorCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Participants"
          value={String(participants.length)}
          hint={
            cycle.targetCapital != null
              ? `Target ${formatCurrency(cycle.targetCapital)}`
              : "Active commitments"
          }
        />
      </div>

      <PmSectionCard
        title="Participants"
        description="Investor contributions and ownership share in this cycle"
      >
        {participants.length === 0 ? (
          <p className={cn("text-sm", pmSubtitleClass)}>No participants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--id-border)] text-left text-xs uppercase tracking-wide text-[var(--id-text-muted)]">
                  <th className="pb-3 pr-4">Participant</th>
                  <th className="pb-3 pr-4">Contribution</th>
                  <th className="pb-3 pr-4">Share</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id} className="border-b border-[var(--id-border)]">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--id-text)]">{participant.investorName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--id-text-muted)]">
                        {participant.referenceNumber}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-[var(--id-text)]">
                      {formatCurrency(participant.amount)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[var(--pm-accent-text)]">
                      {participant.sharePct.toFixed(2)}%
                    </td>
                    <td className="py-3 text-[var(--id-text-secondary)]">
                      {INVESTMENT_ALLOCATION_STATUS_LABELS[participant.status] ??
                        participant.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PmSectionCard>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn(pmCardClass, "p-4")}>
      <p className={pmStatLabelClass}>{label}</p>
      <p className={cn("mt-2", pmStatValueClass, valueClassName)}>{value}</p>
      <p className={cn("mt-1", pmStatLabelClass)}>{hint}</p>
    </div>
  );
}

function ActionButton({
  children,
  className,
  variant = "secondary",
  asChild,
  disabled,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "success" | "danger" | "accent" | "secondary";
  asChild?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    primary: pmPrimaryButtonClass,
    success: "rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-500 border-transparent",
    danger: "rounded-xl bg-red-600 font-semibold text-white hover:bg-red-500 border-transparent",
    accent: pmAccentButtonClass,
    secondary: pmSecondaryButtonClass,
  }[variant];

  return (
    <Button
      asChild={asChild}
      disabled={disabled}
      onClick={onClick}
      size="lg"
      variant="outline"
      className={cn(
        "h-12 min-h-12 w-full border-transparent px-5 text-sm font-semibold sm:w-auto",
        "touch-manipulation active:scale-[0.98]",
        styles,
        className
      )}
    >
      {asChild ? children : <span className="inline-flex items-center gap-2">{children}</span>}
    </Button>
  );
}
