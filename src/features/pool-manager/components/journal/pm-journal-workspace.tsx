"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, TrendingDown, TrendingUp } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { TRADE_ENTRY_RESULT_LABELS } from "@/constants/trade-entry";
import { resolveSimplifiedCyclePhase } from "@/constants/cycle-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { TradeEntry } from "@/domain/trading-journal/types";
import type { TradeEntryResult } from "@/constants/trade-entry";
import { cn, formatCurrency } from "@/lib/utils";
import {
  pmInputClass,
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
  pmTextareaClass,
} from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmPageHeader, PmFormMessage, PmSectionCard } from "../workspace/pm-page-header";
import { SimpleCyclePhaseBar } from "./simple-cycle-phase-bar";
import {
  createTradeEntry,
  fetchJournalWorkspace,
  openJournal,
  type JournalWorkspaceData,
} from "./pm-journal-api";

type OutcomeChoice = "profit" | "loss";

const emptyForm = {
  instrument: "",
  amountUsd: "",
  outcome: "profit" as OutcomeChoice,
  notes: "",
};

async function uploadScreenshot(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/pool-manager/trades/screenshot/upload", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Screenshot upload failed");
  if (!data.url) throw new Error("Screenshot upload failed");
  return data.url;
}

export function PmJournalWorkspace({ cycle }: { cycle: InvestmentCycle }) {
  const [data, setData] = useState<JournalWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "error" } | null>(
    null
  );
  const [form, setForm] = useState(emptyForm);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const writable = cycle.status === "trading" || cycle.status === "distribution";
  const simplifiedPhase = resolveSimplifiedCyclePhase({ cycleStatus: cycle.status });
  const isWin = form.outcome === "profit";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let workspace = await fetchJournalWorkspace(cycle.id);
      if (!workspace.journal && writable) {
        await openJournal(cycle.id);
        workspace = await fetchJournalWorkspace(cycle.id);
      }
      setData(workspace);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to load journal",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [cycle.id, writable]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreview(null);
      return;
    }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  const closedEntries = useMemo(
    () => (data?.entries ?? []).filter((entry) => entry.status === "closed"),
    [data?.entries]
  );

  const totalPnl = useMemo(
    () => closedEntries.reduce((sum, entry) => sum + (entry.realizedPnl ?? 0), 0),
    [closedEntries]
  );

  async function handleRecordTrade(event: React.FormEvent) {
    event.preventDefault();
    if (!writable) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const amountUsd = Number(form.amountUsd);
      if (!form.instrument.trim()) throw new Error("Instrument is required.");
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        throw new Error("Enter a positive dollar amount.");
      }

      const screenshotUrl = screenshotFile ? await uploadScreenshot(screenshotFile) : undefined;

      await createTradeEntry(cycle.id, {
        instrument: form.instrument.trim(),
        amountUsd,
        tradeResult: form.outcome,
        notes: form.notes.trim() || null,
        screenshotUrl,
      });

      setForm(emptyForm);
      setScreenshotFile(null);
      setMessage({
        text:
          form.outcome === "profit"
            ? `Win recorded — ${formatCurrency(amountUsd)} profit distributed to investors.`
            : `Loss recorded — ${formatCurrency(amountUsd)} applied to cycle balance.`,
        variant: "success",
      });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Could not record trade",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PmPageHeader
        eyebrow="Trading Journal"
        title={cycle.name}
        description="Record each completed trade as a win or loss in dollars. Both outcomes update investor balances automatically."
        actions={
          <Link href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`} className={pmSecondaryButtonClass}>
            ← Cycle
          </Link>
        }
      />

      {message && <PmFormMessage message={message.text} variant={message.variant} />}

      <PmSectionCard title="Cycle Status">
        <SimpleCyclePhaseBar cycleStatus={cycle.status} />
        <p className="mt-3 text-sm text-[var(--id-text-muted)]">
          {simplifiedPhase === "funding"
            ? "Funding is open. Start trading from the cycle page when you are ready to record trades."
            : "Trading is active. Select Win or Loss, enter the dollar amount, and attach a screenshot."}
        </p>
      </PmSectionCard>

      {writable && data?.journal && (
        <PmSectionCard title="Record Trade">
          <form
            onSubmit={handleRecordTrade}
            className={cn(
              "space-y-6 rounded-xl border-2 p-5 transition-colors",
              isWin
                ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-500/10"
                : "border-rose-500/40 bg-rose-500/5 dark:border-rose-400/30 dark:bg-rose-500/10"
            )}
          >
            <div>
              <p className="mb-3 text-sm font-medium text-[var(--id-text-secondary)]">Outcome</p>
              <div className="grid grid-cols-2 gap-3">
                <OutcomeButton
                  type="profit"
                  selected={form.outcome === "profit"}
                  disabled={submitting}
                  onSelect={() => setForm((prev) => ({ ...prev, outcome: "profit" }))}
                />
                <OutcomeButton
                  type="loss"
                  selected={form.outcome === "loss"}
                  disabled={submitting}
                  onSelect={() => setForm((prev) => ({ ...prev, outcome: "loss" }))}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <PmFormField label="Instrument" required>
                <Input
                  value={form.instrument}
                  onChange={(e) => setForm((prev) => ({ ...prev, instrument: e.target.value }))}
                  placeholder="e.g. BTC/USDT"
                  className={pmInputClass}
                  disabled={submitting}
                />
              </PmFormField>
              <PmFormField label="Amount (USD)" required hint="Profit or loss in dollars.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--id-text-muted)]">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amountUsd}
                    onChange={(e) => setForm((prev) => ({ ...prev, amountUsd: e.target.value }))}
                    className={cn(pmInputClass, "pl-7")}
                    disabled={submitting}
                    placeholder="0.00"
                  />
                </div>
              </PmFormField>
            </div>

            <PmFormField label="Trade Screenshot" hint="Visible to investors on the marketplace.">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--id-border-strong)] bg-[var(--id-surface-muted)] px-4 py-6 text-center transition-colors hover:border-[var(--pm-accent)]">
                <ImagePlus className="h-5 w-5 text-[var(--id-text-muted)]" />
                <span className="text-sm text-[var(--id-text-secondary)]">
                  {screenshotFile ? screenshotFile.name : "Upload chart screenshot"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={submitting}
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {screenshotPreview ? (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-[var(--id-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshotPreview} alt="Screenshot preview" className="max-h-48 w-full object-cover" />
                </div>
              ) : null}
            </PmFormField>

            <PmFormField label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className={pmTextareaClass}
                disabled={submitting}
                placeholder="Optional context for administrators"
              />
            </PmFormField>

            <Button
              type="submit"
              disabled={submitting || loading}
              className={cn(
                pmPrimaryButtonClass,
                isWin
                  ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
              )}
            >
              {submitting ? "Recording…" : isWin ? "Record Win" : "Record Loss"}
            </Button>
          </form>
        </PmSectionCard>
      )}

      <PmSectionCard
        title={`Recorded Trades (${closedEntries.length})`}
        description={
          closedEntries.length > 0
            ? `Cycle P/L: ${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}`
            : "Completed trades appear here and on the investor marketplace view."
        }
      >
        {loading ? (
          <p className="text-sm text-[var(--id-text-muted)]">Loading trades…</p>
        ) : closedEntries.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No trades recorded yet.</p>
        ) : (
          <ul className="space-y-4">
            {closedEntries.map((entry) => (
              <TradeCard key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </PmSectionCard>
    </div>
  );
}

function OutcomeButton({
  type,
  selected,
  disabled,
  onSelect,
}: {
  type: OutcomeChoice;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isWin = type === "profit";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-base font-semibold transition-all",
        isWin
          ? selected
            ? "border-emerald-500 bg-emerald-500 text-white shadow-sm dark:border-emerald-400 dark:bg-emerald-600"
            : "border-emerald-500/30 bg-[var(--id-surface)] text-emerald-700 hover:border-emerald-500/60 dark:text-emerald-400"
          : selected
            ? "border-rose-500 bg-rose-500 text-white shadow-sm dark:border-rose-400 dark:bg-rose-600"
            : "border-rose-500/30 bg-[var(--id-surface)] text-rose-700 hover:border-rose-500/60 dark:text-rose-400"
      )}
    >
      {isWin ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      {isWin ? "Win" : "Loss"}
    </button>
  );
}

function TradeCard({ entry }: { entry: TradeEntry }) {
  const isWin = entry.tradeResult === "profit" || (entry.realizedPnl ?? 0) > 0;
  const isLoss = entry.tradeResult === "loss" || (entry.realizedPnl ?? 0) < 0;
  const pnl = entry.realizedPnl ?? 0;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border-2",
        isWin
          ? "border-emerald-500/50 bg-emerald-500/5 dark:border-emerald-400/40 dark:bg-emerald-500/10"
          : isLoss
            ? "border-rose-500/50 bg-rose-500/5 dark:border-rose-400/40 dark:bg-rose-500/10"
            : "border-[var(--id-border)] bg-[var(--id-surface-muted)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-[var(--id-text)]">{entry.instrument}</p>
          {entry.tradeResult && (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 text-sm font-semibold",
                isWin
                  ? "text-emerald-700 dark:text-emerald-400"
                  : isLoss
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-[var(--id-text-muted)]"
              )}
            >
              {isWin ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {TRADE_ENTRY_RESULT_LABELS[entry.tradeResult as TradeEntryResult]}
              {entry.realizedPnl != null && (
                <span className="ml-1">
                  {pnl >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(pnl))}
                </span>
              )}
            </p>
          )}
          {entry.profitAppliedAt && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Profit distributed</p>
          )}
          {entry.lossAppliedAt && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Loss applied to balance</p>
          )}
        </div>
        {entry.closedAt && (
          <p className="text-xs text-[var(--id-text-faint)]">
            {new Date(entry.closedAt).toLocaleString()}
          </p>
        )}
      </div>
      {entry.screenshotUrl ? (
        <div className="border-t border-[var(--id-border)] bg-[var(--id-surface)] p-3">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-[var(--id-bg)]">
            <Image
              src={entry.screenshotUrl}
              alt={`${entry.instrument} trade screenshot`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
