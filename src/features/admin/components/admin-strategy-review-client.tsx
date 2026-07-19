"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ROUTES } from "@/constants/routes";
import {
  STRATEGY_ADMIN_TRANSITIONS,
  STRATEGY_STATUS_LABELS,
} from "@/constants/strategy";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { AdminInternalNote } from "@/services/admin-notes.service";
import type { AuditLogEntry } from "@/features/admin/types";
import { AdminInternalNotesPanel } from "./admin-internal-notes-panel";
import { adminTransitionStrategy } from "./admin-review-api";
import { PmStrategyLifecycleTimeline } from "@/features/pool-manager/components/workspace/pm-lifecycle-timeline";

const ACTION_LABELS: Record<string, string> = {
  under_review: "Start Review",
  approved: "Approve",
  draft: "Request Changes",
  archived: "Reject / Archive",
};

export function AdminStrategyReviewClient({
  strategy: initialStrategy,
  cycles,
  managerName,
  managerHref,
  notes,
  history,
}: {
  strategy: Strategy;
  cycles: InvestmentCycle[];
  managerName: string;
  managerHref: string;
  notes: AdminInternalNote[];
  history: AuditLogEntry[];
}) {
  const router = useRouter();
  const [strategy, setStrategy] = useState(initialStrategy);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );

  const adminTransitions = STRATEGY_ADMIN_TRANSITIONS[strategy.status] ?? [];

  const runTransition = useCallback(
    async (status: Strategy["status"]) => {
      setLoading(true);
      setMessage(null);
      try {
        const next = await adminTransitionStrategy(strategy.id, status, reviewNote || undefined);
        setStrategy(next);
        setReviewNote("");
        setMessage({ text: `Strategy moved to ${STRATEGY_STATUS_LABELS[next.status]}`, variant: "success" });
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
    [router, reviewNote, strategy.id]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">Strategy Review</p>
          <h2 className="mt-1 text-2xl font-semibold text-navy-950">{strategy.name}</h2>
          <p className="mt-1 text-sm text-navy-500">{strategy.description ?? "No description provided."}</p>
        </div>
        <span className="rounded-full bg-navy-100 px-3 py-1 text-sm font-medium text-navy-800">
          {STRATEGY_STATUS_LABELS[strategy.status]}
        </span>
      </div>

      {message && (
        <p className={`text-sm ${message.variant === "error" ? "text-rose-600" : "text-emerald-700"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy-900">Strategy Details</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Risk Profile" value={strategy.riskProfile ?? "—"} />
            <Detail label="Investment Style" value={strategy.investmentStyle ?? "—"} />
            <Detail label="Visibility" value={strategy.visibility} />
            <Detail label="Supported Assets" value={strategy.supportedAssets.join(", ") || "—"} />
            <Detail label="Submitted" value={strategy.submittedAt ? new Date(strategy.submittedAt).toLocaleString() : "—"} />
            <Detail label="Approved" value={strategy.approvedAt ? new Date(strategy.approvedAt).toLocaleString() : "—"} />
          </dl>
          {strategy.objectives && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-navy-500">Objectives</p>
              <p className="mt-1 text-sm text-navy-800 whitespace-pre-wrap">{strategy.objectives}</p>
            </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Lifecycle</h3>
          <div className="mt-4">
            <PmStrategyLifecycleTimeline currentStatus={strategy.status} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-navy-900">Review Actions</h3>
          <p className="mt-1 text-xs text-navy-500">All transitions use the strategy lifecycle service.</p>
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
                variant={status === "approved" ? "default" : status === "archived" ? "destructive" : "outline"}
                onClick={() => runTransition(status)}
              >
                {ACTION_LABELS[status] ?? STRATEGY_STATUS_LABELS[status]}
              </Button>
            ))}
            {adminTransitions.length === 0 && (
              <p className="text-sm text-navy-500">No admin actions available for this status.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Related Investment Cycles</h3>
        {cycles.length === 0 ? (
          <p className="mt-3 text-sm text-navy-500">No cycles linked to this strategy.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/50">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="flex items-center justify-between py-3">
                <Link href={`${ROUTES.adminInvestmentCycles}/${cycle.id}`} className="text-sm font-medium text-navy-800 hover:text-royal-600">
                  {cycle.name}
                </Link>
                <span className="text-xs text-navy-500">{cycle.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminInternalNotesPanel entityType="strategy" entityId={strategy.id} initialNotes={notes} />

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-navy-900">Review History</h3>
        <ul className="mt-4 divide-y divide-border/50">
          {history.length === 0 ? (
            <li className="py-2 text-sm text-navy-500">No audit history.</li>
          ) : (
            history.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy-800">{entry.summary}</p>
                  <p className="text-xs text-navy-500">{entry.actorName}</p>
                </div>
                <span className="shrink-0 text-xs text-navy-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-500">{label}</dt>
      <dd className="mt-1 text-sm capitalize text-navy-900">{value}</dd>
    </div>
  );
}
