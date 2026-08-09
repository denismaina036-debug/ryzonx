"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChevronLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { simplifyCycleStatus } from "@/features/pool-manager/utils/pm-status-presentation";
import { INVESTMENT_ALLOCATION_STATUS_LABELS } from "@/constants/investment-allocation";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CycleParticipantView, InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { CycleLiveMetrics } from "@/services/cycle-live-metrics.service";
import {
  pmAccentButtonClass,
  pmCardClass,
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
  pmStatLabelClass,
  pmStatValueClass,
  pmSubtitleClass,
} from "@/features/pool-manager/constants/ui";
import { PmFundingProgress } from "./pm-funding-progress";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import {
  fetchCycleParticipants,
  submitCycle,
  closeCycle,
  distributeCycleProfit,
  transitionCycle,
} from "./pm-api";
import { useIntervalRefresh } from "@/hooks/use-interval-refresh";

type ParticipantRow = CycleParticipantView & { projectedProfit?: number };

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
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<CycleLiveMetrics | null>(null);
  const [openTradeCount, setOpenTradeCount] = useState(0);
  const [profitDistributed, setProfitDistributed] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const isFundingPhase = cycle.status === "approved" || cycle.status === "funding";
  const isTradingPhase = cycle.status === "trading" || cycle.status === "distribution";

  const canCloseCycle =
    (cycle.status === "trading" && openTradeCount === 0) || cycle.status === "distribution";
  const canDistributeProfit = cycle.status === "trading" && !profitDistributed;

  const currentProfit = liveMetrics?.currentCycleProfit ?? cycle.currentCycleProfit;
  const currentCapital = liveMetrics?.currentCapital ?? cycle.raisedCapital;
  const tradesRecorded = liveMetrics?.tradesRecorded ?? 0;
  const profitTone =
    currentProfit > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : currentProfit < 0
        ? "text-red-600 dark:text-red-400"
        : undefined;

  const refreshParticipants = useCallback(async () => {
    const rows = await fetchCycleParticipants(cycle.id);
    setParticipants(rows);
  }, [cycle.id]);

  const refreshLiveMetrics = useCallback(async () => {
    if (!isTradingPhase) return;
    const res = await fetch(`/api/pool-manager/investment-cycles/${cycle.id}/live-metrics`);
    const data = (await res.json()) as { metrics?: CycleLiveMetrics; error?: string };
    if (res.ok && data.metrics) {
      setLiveMetrics(data.metrics);
      setParticipants(data.metrics.participants);
      setCycle((prev) => ({
        ...prev,
        currentCycleProfit: data.metrics!.currentCycleProfit,
        raisedCapital: data.metrics!.currentCapital,
      }));
    }
  }, [cycle.id, isTradingPhase]);

  useEffect(() => {
    void refreshParticipants().catch(() => setParticipants([]));
  }, [refreshParticipants]);

  useEffect(() => {
    if (!isTradingPhase) {
      setLiveMetrics(null);
      return;
    }
    void refreshLiveMetrics().catch(() => undefined);
  }, [isTradingPhase, refreshLiveMetrics]);

  useIntervalRefresh(refreshLiveMetrics, 12_000, isTradingPhase);

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
  }, [cycle.id, cycle.status, liveMetrics?.tradesRecorded]);

  useEffect(() => {
    if (cycle.status !== "trading") {
      setProfitDistributed(false);
      return;
    }
    void fetch(`/api/pool-manager/investment-cycles/${cycle.id}/financial`)
      .then((res) => res.json())
      .then((data: { summary?: { profitSettlement?: { status?: string } | null } }) => {
        setProfitDistributed(data.summary?.profitSettlement?.status === "completed");
      })
      .catch(() => setProfitDistributed(false));
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

  const runCloseCycle = useCallback(async () => {
      setLoading(true);
      setMessage(null);
      try {
        const result = await closeCycle(cycle.id);
        setCycle(result.cycle);
        setCloseDialogOpen(false);
        setMessage({
          text:
            "Cycle closed. Investors can reinvest in the next funding round, move to another pool, or request capital return to their Funding Wallet.",
          variant: "success",
        });
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
    [cycle.id, router]
  );

  const journalHref = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}/journal`;
  const displayParticipants =
    isTradingPhase && liveMetrics?.participants.length
      ? liveMetrics.participants
      : participants;

  return (
    <div className="space-y-6">
      <PmPageHeader
        eyebrow="Investment Cycle"
        title={cycle.name}
        description={
          isFundingPhase
            ? "Investors and funding progress for this cycle"
            : "Live trading performance and projected investor shares"
        }
        actions={
          <PmStatusBadge
            label={simplifyCycleStatus(cycle.status)}
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

          {isFundingPhase && (
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

          {canDistributeProfit && (
            <ActionButton
              disabled={loading}
              variant="accent"
              onClick={() => {
                void runAction(
                  () => distributeCycleProfit(cycle.id),
                  "Profits distributed to investors"
                ).then(() => setProfitDistributed(true));
              }}
            >
              Distribute Profit
            </ActionButton>
          )}

          {canCloseCycle && (
            <ActionButton
              disabled={loading}
              variant="danger"
              onClick={() => setCloseDialogOpen(true)}
            >
              Close Cycle
            </ActionButton>
          )}

          {cycle.status === "trading" && openTradeCount > 0 && (
            <p className="self-center text-sm text-amber-700 dark:text-amber-300">
              Close all {openTradeCount} open trade{openTradeCount === 1 ? "" : "s"} before closing
              the cycle.
            </p>
          )}

          {isTradingPhase && (
            <ActionButton asChild variant="accent">
              <Link href={journalHref}>
                <BookOpen className="h-4 w-4" />
                Trading Journal
              </Link>
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

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="border-[var(--id-border)] bg-[var(--id-surface)] text-[var(--id-text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close cycle</DialogTitle>
            <DialogDescription className="text-[var(--id-text-secondary)]">
              Distribute profits first, then close this cycle. Capital is not reinvested automatically.
              Open the next funding round separately from the pool page when you are ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              disabled={loading || !profitDistributed}
              className="w-full"
              onClick={() => void runCloseCycle()}
            >
              Close cycle
            </Button>
            {!profitDistributed && (
              <p className="text-xs text-[var(--id-text-muted)]">
                Distribute profits before closing this cycle.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isFundingPhase ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Raised capital" value={formatCurrency(cycle.raisedCapital)} />
            <StatCard
              label="Investors"
              value={String(cycle.investorCount)}
              hint={
                cycle.targetCapital != null
                  ? `Target ${formatCurrency(cycle.targetCapital)}`
                  : undefined
              }
            />
          </div>

          {cycle.targetCapital != null && cycle.targetCapital > 0 && (
            <PmSectionCard title="Funding progress">
              <PmFundingProgress
                raised={cycle.raisedCapital}
                target={cycle.targetCapital}
                investorCount={cycle.investorCount}
              />
            </PmSectionCard>
          )}

          <PmSectionCard title="Investors" description="Who has invested in this cycle">
            <ParticipantList participants={displayParticipants} showProjected={false} />
          </PmSectionCard>
        </>
      ) : isTradingPhase ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Capital Traded" value={formatCurrency(currentCapital)} />
            <StatCard
              label="Total Capital Under Management"
              value={
                cycle.targetCapital != null && cycle.targetCapital > 0
                  ? formatCurrency(cycle.targetCapital)
                  : formatCurrency(currentCapital)
              }
            />
            <StatCard label="Investors" value={String(cycle.investorCount)} />
            <StatCard
              label="Current profit"
              value={formatCurrency(currentProfit)}
              valueClassName={profitTone}
              hint="Realized P&L from closed trades"
            />
          </div>

          <PmSectionCard title="Trading activity" description="Live capital and trade count for this cycle">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className={pmStatLabelClass}>Trades recorded</dt>
                <dd className={cn("mt-1", pmStatValueClass, "text-base")}>{tradesRecorded}</dd>
              </div>
            </dl>
          </PmSectionCard>

          <PmSectionCard
            title="Projected profit"
            description="Estimated share if profits were distributed now. Does not change wallets or portfolio value."
          >
            <ParticipantList participants={displayParticipants} showProjected />
          </PmSectionCard>

          <PmSectionCard title="Trading journal">
            <p className={cn("text-sm", pmSubtitleClass)}>
              Record wins and losses in the journal. Projected profits update automatically.
            </p>
            <ActionButton asChild variant="accent" className="mt-4">
              <Link href={journalHref}>
                <BookOpen className="h-4 w-4" />
                Open Trading Journal
              </Link>
            </ActionButton>
          </PmSectionCard>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total profit recorded"
              value={formatCurrency(cycle.currentCycleProfit)}
              valueClassName={profitTone}
            />
            <StatCard label="Raised capital" value={formatCurrency(cycle.raisedCapital)} />
            <StatCard label="Participants" value={String(participants.length)} />
          </div>
          <PmSectionCard title="Participants">
            <ParticipantList participants={displayParticipants} showProjected={false} />
          </PmSectionCard>
        </>
      )}
    </div>
  );
}

function ParticipantList({
  participants,
  showProjected,
}: {
  participants: ParticipantRow[];
  showProjected: boolean;
}) {
  if (participants.length === 0) {
    return <p className={cn("text-sm", pmSubtitleClass)}>No participants yet.</p>;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="rounded-xl border border-[var(--id-border)] p-4 text-sm"
          >
            <p className="font-medium text-[var(--id-text)]">{participant.investorName}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Investment" value={formatCurrency(participant.amount)} />
              <Field label="Ownership" value={`${participant.sharePct.toFixed(2)}%`} />
              <Field
                label="Investment date"
                value={new Date(participant.allocatedAt).toLocaleDateString()}
              />
              <Field
                label="Status"
                value={
                  INVESTMENT_ALLOCATION_STATUS_LABELS[participant.status] ?? participant.status
                }
              />
              {showProjected && (
                <Field
                  label="Projected profit"
                  value={formatCurrency(participant.projectedProfit ?? 0)}
                  className="col-span-2"
                  valueClassName={projectedTone(participant.projectedProfit ?? 0)}
                />
              )}
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--id-border)] text-left text-xs uppercase tracking-wide text-[var(--id-text-muted)]">
              <th className="pb-3 pr-4">Investor</th>
              <th className="pb-3 pr-4">Investment</th>
              <th className="pb-3 pr-4">Ownership %</th>
              <th className="pb-3 pr-4">Investment date</th>
              {showProjected && <th className="pb-3 pr-4">Projected profit</th>}
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id} className="border-b border-[var(--id-border)]">
                <td className="py-3 pr-4">
                  <p className="font-medium text-[var(--id-text)]">{participant.investorName}</p>
                </td>
                <td className="py-3 pr-4 text-[var(--id-text)]">
                  {formatCurrency(participant.amount)}
                </td>
                <td className="py-3 pr-4 font-medium text-[var(--pm-accent-text)]">
                  {participant.sharePct.toFixed(2)}%
                </td>
                <td className="py-3 pr-4 text-[var(--id-text-secondary)]">
                  {new Date(participant.allocatedAt).toLocaleDateString()}
                </td>
                {showProjected && (
                  <td
                    className={cn(
                      "py-3 pr-4 font-medium",
                      projectedTone(participant.projectedProfit ?? 0)
                    )}
                  >
                    {formatCurrency(participant.projectedProfit ?? 0)}
                  </td>
                )}
                <td className="py-3 text-[var(--id-text-secondary)]">
                  {INVESTMENT_ALLOCATION_STATUS_LABELS[participant.status] ?? participant.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd className={cn("mt-1 font-medium text-[var(--id-text)]", valueClassName)}>{value}</dd>
    </div>
  );
}

function projectedTone(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return undefined;
}

function StatCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn(pmCardClass, "p-4")}>
      <p className={pmStatLabelClass}>{label}</p>
      <p className={cn("mt-2", pmStatValueClass, valueClassName)}>{value}</p>
      {hint ? <p className={cn("mt-1", pmStatLabelClass)}>{hint}</p> : null}
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
    success:
      "rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-500 border-transparent",
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
