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
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import {
  fetchCycleParticipants,
  submitCycle,
  transitionCycle,
} from "./pm-api";

const TRANSITION_LABELS: Record<string, string> = {
  distribution: "Close Investment Cycle",
  archived: "Archive Cycle",
};

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
      ? "text-emerald-400"
      : cycle.currentCycleProfit < 0
        ? "text-red-400"
        : "text-white";

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

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Cycle actions</p>
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
            <p className="self-center text-sm text-amber-300">
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
          <p className="text-sm text-navy-500">No participants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-navy-500">
                  <th className="pb-3 pr-4">Participant</th>
                  <th className="pb-3 pr-4">Contribution</th>
                  <th className="pb-3 pr-4">Share</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{participant.investorName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-navy-500">
                        {participant.referenceNumber}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-white">{formatCurrency(participant.amount)}</td>
                    <td className="py-3 pr-4 font-medium text-amber-200">
                      {participant.sharePct.toFixed(2)}%
                    </td>
                    <td className="py-3 text-navy-300">
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", valueClassName ?? "text-white")}>{value}</p>
      <p className="mt-1 text-xs text-navy-500">{hint}</p>
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
    primary: "bg-amber-500 text-black hover:bg-amber-400 border-transparent",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 border-transparent",
    danger: "bg-red-600 text-white hover:bg-red-500 border-transparent",
    accent: "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
    secondary: "border-white/15 bg-transparent text-white hover:bg-white/5",
  }[variant];

  return (
    <Button
      asChild={asChild}
      disabled={disabled}
      onClick={onClick}
      size="lg"
      variant="outline"
      className={cn(
        "h-12 min-h-12 w-full px-5 text-sm font-semibold sm:w-auto",
        "touch-manipulation active:scale-[0.98]",
        styles,
        className
      )}
    >
      {asChild ? children : <span className="inline-flex items-center gap-2">{children}</span>}
    </Button>
  );
}
