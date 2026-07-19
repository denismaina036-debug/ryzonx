"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import {
  INVESTMENT_CYCLE_ADMIN_TRANSITIONS,
  INVESTMENT_CYCLE_STATUS_LABELS,
} from "@/constants/investment-cycle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { InvestmentAllocation, InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { AdminInternalNote } from "@/services/admin-notes.service";
import type { AuditLogEntry } from "@/features/admin/types";
import { AdminInternalNotesPanel } from "./admin-internal-notes-panel";
import { adminTransitionCycle, fetchCycleAllocations } from "./admin-review-api";
import { PmCycleLifecycleTimeline } from "@/features/pool-manager/components/workspace/pm-lifecycle-timeline";
import { PmFundingProgress } from "@/features/pool-manager/components/workspace/pm-funding-progress";

const ACTION_LABELS: Record<string, string> = {
  approved: "Approve",
  draft: "Request Changes",
  funding: "Open Funding",
  trading: "Close Funding → Trading",
  approved_from_funding: "Pause Funding",
  distribution: "Start Distribution",
  completed: "Mark Completed",
  archived: "Archive",
};

function transitionLabel(from: InvestmentCycle["status"], to: InvestmentCycle["status"]): string {
  if (from === "funding" && to === "approved") {
    return ACTION_LABELS["approved_from_funding"] ?? "Pause Funding";
  }
  return ACTION_LABELS[to] ?? INVESTMENT_CYCLE_STATUS_LABELS[to] ?? to;
}

export function AdminCycleReviewClient({
  cycle: initialCycle,
  strategy,
  managerName,
  managerHref,
  notes,
  history,
}: {
  cycle: InvestmentCycle;
  strategy: Strategy | null;
  managerName: string;
  managerHref: string;
  notes: AdminInternalNote[];
  history: AuditLogEntry[];
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState(initialCycle);
  const [allocations, setAllocations] = useState<InvestmentAllocation[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const adminTransitions = INVESTMENT_CYCLE_ADMIN_TRANSITIONS[cycle.status] ?? [];

  useEffect(() => {
    void fetchCycleAllocations(cycle.id)
      .then(setAllocations)
      .catch(() => setAllocations([]));
  }, [cycle.id]);

  const runTransition = useCallback(
    async (status: InvestmentCycle["status"]) => {
      setLoading(true);
      setMessage(null);
      try {
        const next = await adminTransitionCycle(cycle.id, status, reviewNote || undefined);
        setCycle(next);
        setReviewNote("");
        setMessage({
          text: `Cycle moved to ${INVESTMENT_CYCLE_STATUS_LABELS[next.status]}`,
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
    [cycle.id, reviewNote, router]
  );

  const timeline = [
    { label: "Created", at: cycle.createdAt },
    { label: "Submitted", at: cycle.submittedAt },
    { label: "Approved", at: cycle.approvedAt },
    { label: "Funding opened", at: cycle.fundingStartedAt },
    { label: "Trading started", at: cycle.tradingStartedAt },
    { label: "Distribution", at: cycle.distributionStartedAt },
    { label: "Completed", at: cycle.completedAt },
    { label: "Archived", at: cycle.archivedAt },
  ].filter((t) => t.at);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">Investment Cycle Review</p>
          <h2 className="mt-1 text-2xl font-semibold text-navy-950">{cycle.name}</h2>
          <p className="mt-1 text-sm text-navy-500">{cycle.description ?? "No description provided."}</p>
        </div>
        <span className="rounded-full bg-navy-100 px-3 py-1 text-sm font-medium text-navy-800">
          {INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
        </span>
      </div>

      {message && (
        <p className={`text-sm ${message.variant === "error" ? "text-rose-600" : "text-emerald-700"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy-900">Funding Configuration</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Target Capital" value={cycle.targetCapital != null ? formatCurrency(cycle.targetCapital) : "—"} />
            <Detail label="Min Investment" value={cycle.minInvestment != null ? formatCurrency(cycle.minInvestment) : "—"} />
            <Detail label="Max Capacity" value={cycle.maxCapacity != null ? formatCurrency(cycle.maxCapacity) : "—"} />
            <Detail label="Duration" value={cycle.durationDays != null ? `${cycle.durationDays} days` : "—"} />
            <Detail label="Funding Deadline" value={cycle.fundingDeadline ? new Date(cycle.fundingDeadline).toLocaleDateString() : "—"} />
            <Detail label="Investors" value={String(cycle.investorCount)} />
          </dl>
          <div className="mt-6 rounded-lg bg-navy-950 p-4">
            <PmFundingProgress
              raised={cycle.raisedCapital}
              target={cycle.targetCapital}
              investorCount={cycle.investorCount}
            />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-navy-900">Strategy</h3>
            {strategy ? (
              <>
                <p className="mt-2 text-sm font-medium text-navy-800">{strategy.name}</p>
                <Link href={`${ROUTES.adminStrategies}/${strategy.id}`} className="mt-2 inline-block text-sm text-royal-600 hover:underline">
                  View strategy review →
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-navy-500">Strategy not found.</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-navy-900">Pool Manager</h3>
            <p className="mt-2 text-sm font-medium text-navy-800">{managerName}</p>
            <Link href={managerHref} className="mt-2 inline-block text-sm text-royal-600 hover:underline">
              View manager oversight →
            </Link>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Lifecycle</h3>
          <div className="mt-4">
            <PmCycleLifecycleTimeline currentStatus={cycle.status} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Review Actions</h3>
          <p className="mt-1 text-xs text-navy-500">All transitions use the investment cycle lifecycle service.</p>
          <Textarea
            className="mt-4 resize-none"
            rows={3}
            placeholder="Optional internal note for this action…"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {adminTransitions.map((status) => (
              <Button
                key={status}
                disabled={loading}
                variant={status === "approved" || status === "funding" ? "default" : status === "draft" ? "outline" : "secondary"}
                onClick={() => runTransition(status)}
              >
                {transitionLabel(cycle.status, status)}
              </Button>
            ))}
            {adminTransitions.length === 0 && (
              <p className="text-sm text-navy-500">No admin actions available for this status.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Allocations</h3>
        {allocations.length === 0 ? (
          <p className="mt-3 text-sm text-navy-500">No allocations recorded for this cycle.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-500">
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-mono text-xs">{a.referenceNumber}</td>
                    <td className="px-3 py-2">{formatCurrency(a.amount)}</td>
                    <td className="px-3 py-2 capitalize">{a.status}</td>
                    <td className="px-3 py-2 text-navy-500">{new Date(a.allocatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminInternalNotesPanel entityType="investment_cycle" entityId={cycle.id} initialNotes={notes} />

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Timeline & History</h3>
        <ul className="mt-4 space-y-2">
          {timeline.map((item) => (
            <li key={item.label} className="flex justify-between text-sm">
              <span className="text-navy-700">{item.label}</span>
              <span className="text-navy-500">{new Date(item.at!).toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-6 divide-y divide-border/50">
          {history.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium text-navy-800">{entry.summary}</p>
                <p className="text-xs text-navy-500">{entry.actorName}</p>
              </div>
              <span className="shrink-0 text-xs text-navy-400">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-500">{label}</dt>
      <dd className="mt-1 text-sm text-navy-900">{value}</dd>
    </div>
  );
}
