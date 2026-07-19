"use client";

import { useCallback, useState } from "react";
import { TRADE_ENTRY_STATUS_LABELS, TRADE_ENTRY_DIRECTION_LABELS } from "@/constants/trade-entry";
import { CYCLE_PROGRESS_PHASE_LABELS } from "@/constants/cycle-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCycleOperationsView } from "@/services/admin-operations-journal.service";
import { CycleProgressTimeline } from "@/features/operations/components/cycle-progress-timeline";

async function fetchOperations(cycleId: string): Promise<AdminCycleOperationsView> {
  const res = await fetch(`/api/admin/investment-cycles/${cycleId}/operations`);
  const data = (await res.json()) as AdminCycleOperationsView & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load operations");
  return data;
}

async function postAction(
  cycleId: string,
  body: { action: string; reason?: string; note?: string }
) {
  const res = await fetch(`/api/admin/investment-cycles/${cycleId}/operations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Action failed");
}

export function AdminCycleOperationsPanel({
  cycleId,
  initial,
}: {
  cycleId: string;
  initial: AdminCycleOperationsView;
}) {
  const [data, setData] = useState(initial);
  const [flagReason, setFlagReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchOperations(cycleId);
    setData(next);
  }, [cycleId]);

  const run = async (action: () => Promise<void>, success: string) => {
    setLoading(true);
    setMessage(null);
    try {
      await action();
      await refresh();
      setMessage(success);
      setFlagReason("");
      setReviewNote("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-white/10 bg-navy-900/40 p-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Operations Review</h3>
        <p className="mt-1 text-sm text-navy-400">
          Read-only journal view. Administrative actions are audit-logged.
        </p>
      </div>

      {message && <p className="text-sm text-amber-200">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="text-sm font-medium text-navy-300">Progress</h4>
          <p className="mt-1 text-xs text-navy-500">
            Phase: {CYCLE_PROGRESS_PHASE_LABELS[data.progress.currentPhase]}
          </p>
          <div className="mt-3">
            <CycleProgressTimeline
              currentPhase={data.progress.currentPhase}
              events={data.progress.timeline.slice(0, 8).map((e) => ({
                label: e.label,
                occurredAt: e.occurredAt,
                description: e.description,
              }))}
            />
          </div>
        </section>

        <section>
          <h4 className="text-sm font-medium text-navy-300">Metrics</h4>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Metric label="Trades" value={data.progress.metrics.totalTrades} />
            <Metric label="Open" value={data.progress.metrics.openPositions} />
            <Metric label="Closed" value={data.progress.metrics.closedPositions} />
            <Metric label="Winning" value={data.progress.metrics.winningTrades} />
            <Metric label="Losing" value={data.progress.metrics.losingTrades} />
            <Metric label="Exposure" value={data.progress.metrics.currentExposure.toFixed(2)} />
          </dl>
        </section>
      </div>

      <section>
        <h4 className="text-sm font-medium text-navy-300">Trade Activity</h4>
        {data.entries.length === 0 ? (
          <p className="mt-2 text-sm text-navy-500">No trade entries recorded.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase text-navy-500">
                  <th className="pb-2 pr-4">Reference</th>
                  <th className="pb-2 pr-4">Instrument</th>
                  <th className="pb-2 pr-4">Direction</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Opened</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.slice(0, 20).map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] text-navy-300">
                    <td className="py-2 pr-4 font-mono text-xs">{e.tradeReference}</td>
                    <td className="py-2 pr-4">{e.instrument}</td>
                    <td className="py-2 pr-4">{TRADE_ENTRY_DIRECTION_LABELS[e.direction]}</td>
                    <td className="py-2 pr-4">{TRADE_ENTRY_STATUS_LABELS[e.status]}</td>
                    <td className="py-2 text-navy-500">
                      {e.openedAt ? new Date(e.openedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium text-navy-300">Flag operational issue</h4>
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Describe the operational concern…"
            className="mt-2 border-white/10 bg-navy-950"
            rows={3}
          />
          <Button
            className="mt-2"
            variant="outline"
            disabled={loading || !flagReason.trim()}
            onClick={() =>
              run(
                () => postAction(cycleId, { action: "flag", reason: flagReason }),
                "Operational flag recorded"
              )
            }
          >
            Flag Issue
          </Button>
        </div>
        <div>
          <h4 className="text-sm font-medium text-navy-300">Record review</h4>
          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Optional review note…"
            className="mt-2 border-white/10 bg-navy-950"
            rows={3}
          />
          <Button
            className="mt-2"
            disabled={loading}
            onClick={() =>
              run(
                () => postAction(cycleId, { action: "review", note: reviewNote }),
                "Review recorded"
              )
            }
          >
            Record Review
          </Button>
        </div>
      </section>

      <section>
        <h4 className="text-sm font-medium text-navy-300">Audit Trail</h4>
        {data.auditTrail.length === 0 ? (
          <p className="mt-2 text-sm text-navy-500">No audit entries.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.auditTrail.slice(0, 15).map((a) => (
              <li key={a.id} className="flex justify-between gap-4 text-navy-400">
                <span>
                  {a.actorName}: {a.summary}
                </span>
                <span className="shrink-0 text-navy-500">
                  {new Date(a.createdAt).toLocaleString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-navy-500">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
    </div>
  );
}
