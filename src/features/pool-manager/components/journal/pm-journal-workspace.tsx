"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import {
  TRADE_ENTRY_DIRECTION_LABELS,
  TRADE_ENTRY_DIRECTIONS,
  TRADE_ENTRY_STATUS_LABELS,
} from "@/constants/trade-entry";
import { CYCLE_PROGRESS_PHASE_LABELS } from "@/constants/cycle-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { TradeEntry } from "@/domain/trading-journal/types";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "../workspace/pm-page-header";
import { PmStatusBadge } from "../workspace/pm-status-badge";
import { CycleProgressTimeline } from "@/features/operations/components/cycle-progress-timeline";
import {
  closeTradeEntry,
  createSnapshot,
  createTradeEntry,
  fetchJournalWorkspace,
  openJournal,
  openTradeEntry,
  type JournalWorkspaceData,
} from "./pm-journal-api";

const emptyForm = {
  instrument: "",
  market: "",
  direction: "long" as const,
  entryPrice: "",
  quantity: "",
  notes: "",
};

export function PmJournalWorkspace({ cycle }: { cycle: InvestmentCycle }) {
  const [data, setData] = useState<JournalWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );
  const [form, setForm] = useState(emptyForm);
  const [closeForm, setCloseForm] = useState<{ entryId: string; exitPrice: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspace = await fetchJournalWorkspace(cycle.id);
      setData(workspace);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to load journal",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [cycle.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const writable = cycle.status === "trading" || cycle.status === "distribution";

  const run = async (action: () => Promise<void>, success: string) => {
    setMessage(null);
    try {
      await action();
      setMessage({ text: success, variant: "success" });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Action failed",
        variant: "error",
      });
    }
  };

  const handleCreateDraft = () =>
    run(async () => {
      await createTradeEntry(cycle.id, {
        instrument: form.instrument,
        market: form.market || null,
        direction: form.direction,
        entryPrice: Number(form.entryPrice),
        quantity: Number(form.quantity),
        notes: form.notes || null,
      });
      setForm(emptyForm);
    }, "Draft trade saved");

  const entries = data?.entries ?? [];
  const openEntries = entries.filter((e) => e.status === "open" || e.status === "partially_closed");
  const closedEntries = entries.filter((e) => e.status === "closed");
  const draftEntries = entries.filter((e) => e.status === "draft");

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Trading Journal"
        title={cycle.name}
        description="Record operational trades for this investment cycle. Entries are audit-logged and visible to administrators."
        actions={
          <Link
            href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`}
            className="text-sm text-amber-300/80 hover:text-amber-200"
          >
            ← Cycle detail
          </Link>
        }
      />

      {message && <PmFormMessage message={message.text} variant={message.variant} />}

      {!data?.journal && writable && (
        <PmSectionCard title="Open Journal">
          <p className="text-sm text-navy-400">
            Initialize the trading journal for this cycle before recording trades.
          </p>
          <Button
            className="mt-4"
            disabled={loading}
            onClick={() => run(() => openJournal(cycle.id).then(() => undefined), "Journal opened")}
          >
            Open Journal
          </Button>
        </PmSectionCard>
      )}

      {data?.progress && (
        <div className="grid gap-6 lg:grid-cols-3">
          <PmSectionCard title="Cycle Progress" className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <PmStatusBadge
                status={cycle.status}
                label={INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
              />
              <span className="text-sm text-navy-400">
                Phase: {CYCLE_PROGRESS_PHASE_LABELS[data.progress.currentPhase]}
              </span>
            </div>
            <CycleProgressTimeline
              currentPhase={data.progress.currentPhase}
              events={data.progress.timeline.map((e) => ({
                label: e.label,
                occurredAt: e.occurredAt,
                description: e.description,
              }))}
            />
          </PmSectionCard>

          <PmSectionCard title="Operational Metrics">
            <MetricsGrid metrics={data.progress.metrics} />
            {writable && (
              <Button
                variant="outline"
                className="mt-4 w-full border-white/10"
                disabled={loading}
                onClick={() => run(() => createSnapshot(cycle.id).then(() => undefined), "Snapshot recorded")}
              >
                Record Snapshot
              </Button>
            )}
          </PmSectionCard>
        </div>
      )}

      {writable && data?.journal && (
        <PmSectionCard title="Record Trade">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instrument">
              <Input
                value={form.instrument}
                onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
                placeholder="e.g. BTC/USDT"
                className="border-white/10 bg-navy-950"
              />
            </Field>
            <Field label="Market">
              <Input
                value={form.market}
                onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
                placeholder="Optional"
                className="border-white/10 bg-navy-950"
              />
            </Field>
            <Field label="Direction">
              <select
                value={form.direction}
                onChange={(e) =>
                  setForm((f) => ({ ...f, direction: e.target.value as typeof form.direction }))
                }
                className="w-full rounded-md border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              >
                {TRADE_ENTRY_DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {TRADE_ENTRY_DIRECTION_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Entry Price">
              <Input
                type="number"
                step="any"
                value={form.entryPrice}
                onChange={(e) => setForm((f) => ({ ...f, entryPrice: e.target.value }))}
                className="border-white/10 bg-navy-950"
              />
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="border-white/10 bg-navy-950"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="border-white/10 bg-navy-950"
                rows={2}
              />
            </Field>
          </div>
          <Button className="mt-4" onClick={handleCreateDraft}>
            Save Draft
          </Button>
        </PmSectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <TradeList
          title="Drafts"
          entries={draftEntries}
          empty="No draft trades."
          writable={writable}
          onOpen={(entry) =>
            run(() => openTradeEntry(cycle.id, entry.id).then(() => undefined), "Trade opened")
          }
        />
        <TradeList
          title="Open Positions"
          entries={openEntries}
          empty="No open positions."
          writable={writable}
          onClose={(entry) => setCloseForm({ entryId: entry.id, exitPrice: "" })}
        />
        <TradeList title="Closed Positions" entries={closedEntries} empty="No closed trades yet." />
      </div>

      {closeForm && (
        <PmSectionCard title="Close Trade">
          <Field label="Exit Price">
            <Input
              type="number"
              step="any"
              value={closeForm.exitPrice}
              onChange={(e) => setCloseForm((f) => f && { ...f, exitPrice: e.target.value })}
              className="max-w-xs border-white/10 bg-navy-950"
            />
          </Field>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() =>
                run(async () => {
                  await closeTradeEntry(cycle.id, closeForm.entryId, {
                    exitPrice: Number(closeForm.exitPrice),
                  });
                  setCloseForm(null);
                }, "Trade closed")
              }
            >
              Confirm Close
            </Button>
            <Button variant="ghost" onClick={() => setCloseForm(null)}>
              Cancel
            </Button>
          </div>
        </PmSectionCard>
      )}

      {(data?.snapshots?.length ?? 0) > 0 && (
        <PmSectionCard title="Snapshots">
          <ul className="space-y-2 text-sm">
            {data!.snapshots.slice(0, 5).map((s) => (
              <li key={s.id} className="flex justify-between text-navy-300">
                <span>
                  {s.openPositionsCount} open · {s.closedPositionsCount} closed · {s.totalTrades}{" "}
                  trades
                </span>
                <span className="text-navy-500">
                  {new Date(s.snapshotAt).toLocaleString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
        </PmSectionCard>
      )}
    </div>
  );
}

function MetricsGrid({
  metrics,
}: {
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    openPositions: number;
    closedPositions: number;
    averageHoldingHours: number | null;
    currentExposure: number;
  };
}) {
  const items = [
    { label: "Total trades", value: metrics.totalTrades },
    { label: "Winning", value: metrics.winningTrades },
    { label: "Losing", value: metrics.losingTrades },
    { label: "Open", value: metrics.openPositions },
    { label: "Closed", value: metrics.closedPositions },
    {
      label: "Avg hold (hrs)",
      value: metrics.averageHoldingHours != null ? metrics.averageHoldingHours.toFixed(1) : "—",
    },
    { label: "Exposure", value: metrics.currentExposure.toFixed(2) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-navy-500">{item.label}</dt>
          <dd className="text-lg font-semibold text-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TradeList({
  title,
  entries,
  empty,
  writable,
  onOpen,
  onClose,
}: {
  title: string;
  entries: TradeEntry[];
  empty: string;
  writable?: boolean;
  onOpen?: (entry: TradeEntry) => void;
  onClose?: (entry: TradeEntry) => void;
}) {
  return (
    <PmSectionCard title={title}>
      {entries.length === 0 ? (
        <p className="text-sm text-navy-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-white/[0.06] bg-navy-950/50 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{entry.instrument}</p>
                  <p className="text-xs text-navy-500 font-mono">{entry.tradeReference}</p>
                </div>
                <span className="text-xs capitalize text-navy-400">
                  {TRADE_ENTRY_STATUS_LABELS[entry.status]}
                </span>
              </div>
              <p className="mt-2 text-xs text-navy-400">
                {TRADE_ENTRY_DIRECTION_LABELS[entry.direction]} · {entry.quantity} @{" "}
                {entry.entryPrice}
                {entry.exitPrice != null && ` → ${entry.exitPrice}`}
              </p>
              {writable && onOpen && entry.status === "draft" && (
                <Button size="sm" variant="outline" className="mt-2 border-white/10" onClick={() => onOpen(entry)}>
                  Open Trade
                </Button>
              )}
              {writable && onClose && (
                <Button size="sm" className="mt-2" onClick={() => onClose(entry)}>
                  Close
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </PmSectionCard>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs text-navy-500">{label}</span>
      {children}
    </label>
  );
}
