"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, TrendingDown, TrendingUp } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  TRADE_ENTRY_DIRECTION_LABELS,
  TRADE_ENTRY_DIRECTIONS,
  TRADE_ENTRY_RESULT_LABELS,
} from "@/constants/trade-entry";
import { resolveSimplifiedCyclePhase } from "@/constants/cycle-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { TradeEntry } from "@/domain/trading-journal/types";
import { formatCurrency } from "@/lib/utils";
import {
  pmInputClass,
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
  pmSelectContentClass,
  pmSelectItemClass,
  pmSelectTriggerClass,
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

const emptyForm = {
  instrument: "",
  direction: "long" as const,
  entryPrice: "",
  exitPrice: "",
  quantity: "",
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
      const entryPrice = Number(form.entryPrice);
      const exitPrice = Number(form.exitPrice);
      const quantity = Number(form.quantity);
      if (!form.instrument.trim()) throw new Error("Instrument is required.");
      if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
        throw new Error("Entry price must be positive.");
      }
      if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
        throw new Error("Exit price must be positive.");
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Quantity must be positive.");
      }

      const screenshotUrl = screenshotFile ? await uploadScreenshot(screenshotFile) : undefined;
      const inferredResult =
        exitPrice === entryPrice ? "breakeven" : exitPrice > entryPrice ? "profit" : "loss";

      await createTradeEntry(cycle.id, {
        instrument: form.instrument.trim(),
        direction: form.direction,
        entryPrice,
        exitPrice,
        quantity,
        notes: form.notes.trim() || null,
        tradeResult: inferredResult,
        screenshotUrl,
      });

      setForm(emptyForm);
      setScreenshotFile(null);
      setMessage({ text: "Trade recorded. Investors can now see it in the journal.", variant: "success" });
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
        description="Record completed trades with a screenshot. Each trade updates the cycle P/L for investors."
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
            : "Trading is active. Add each completed trade below — profit and loss are calculated automatically."}
        </p>
      </PmSectionCard>

      {writable && data?.journal && (
        <PmSectionCard title="Add Trade">
          <form onSubmit={handleRecordTrade} className="space-y-5">
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
              <PmFormField label="Direction" required>
                <Select
                  value={form.direction}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, direction: value as typeof form.direction }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger className={pmSelectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={pmSelectContentClass}>
                    {TRADE_ENTRY_DIRECTIONS.map((direction) => (
                      <SelectItem key={direction} value={direction} className={pmSelectItemClass}>
                        {TRADE_ENTRY_DIRECTION_LABELS[direction]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PmFormField>
              <PmFormField label="Entry Price" required>
                <Input
                  type="number"
                  step="any"
                  value={form.entryPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, entryPrice: e.target.value }))}
                  className={pmInputClass}
                  disabled={submitting}
                />
              </PmFormField>
              <PmFormField label="Exit Price" required>
                <Input
                  type="number"
                  step="any"
                  value={form.exitPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, exitPrice: e.target.value }))}
                  className={pmInputClass}
                  disabled={submitting}
                />
              </PmFormField>
              <PmFormField label="Quantity" required>
                <Input
                  type="number"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className={pmInputClass}
                  disabled={submitting}
                />
              </PmFormField>
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
            </div>
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
            <Button type="submit" disabled={submitting || loading} className={pmPrimaryButtonClass}>
              {submitting ? "Recording…" : "Record Trade"}
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

function TradeCard({ entry }: { entry: TradeEntry }) {
  const isProfit = (entry.realizedPnl ?? 0) >= 0;
  return (
    <li className="overflow-hidden rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-[var(--id-text)]">{entry.instrument}</p>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">
            {TRADE_ENTRY_DIRECTION_LABELS[entry.direction]} · {entry.quantity} @ {entry.entryPrice}
            {entry.exitPrice != null ? ` → ${entry.exitPrice}` : ""}
          </p>
          {entry.tradeResult && (
            <p
              className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${
                isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {TRADE_ENTRY_RESULT_LABELS[entry.tradeResult]}
              {entry.realizedPnl != null &&
                ` · ${entry.realizedPnl >= 0 ? "+" : ""}${formatCurrency(entry.realizedPnl)}`}
            </p>
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
