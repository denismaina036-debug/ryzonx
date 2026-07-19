"use client";

import { useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  CHALLENGE_TRADE_DIRECTION,
  CHALLENGE_TRADE_STATUS,
  type ChallengeTrade,
  type CreateChallengeTradeInput,
} from "@/domain/challenge/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

interface ChallengeJournalProps {
  trades: ChallengeTrade[];
  canSubmit: boolean;
  enrollmentId: string;
  currentTradingDay: number;
  onRefresh: () => void;
}

const emptyForm: CreateChallengeTradeInput = {
  tradingDay: 1,
  tradeDate: new Date().toISOString().slice(0, 10),
  instrument: "",
  market: "",
  direction: CHALLENGE_TRADE_DIRECTION.BUY,
  entryPrice: 0,
  exitPrice: 0,
  lotSize: 0.01,
  profitLoss: 0,
  notes: "",
  screenshotUrl: "",
};

export function ChallengeJournal({
  trades,
  canSubmit,
  enrollmentId,
  currentTradingDay,
  onRefresh,
}: ChallengeJournalProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateChallengeTradeInput>({
    ...emptyForm,
    tradingDay: currentTradingDay || 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, tradingDay: currentTradingDay || 1 });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(trade: ChallengeTrade) {
    setEditingId(trade.id);
    setForm({
      tradingDay: trade.tradingDay,
      tradeDate: trade.tradeDate,
      instrument: trade.instrument,
      market: trade.market ?? "",
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      lotSize: trade.lotSize,
      profitLoss: trade.profitLoss,
      notes: trade.notes ?? "",
      screenshotUrl: trade.screenshotUrl ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/investor/challenge-center/trades/${editingId}`
        : "/api/investor/challenge-center/trades";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? form : { ...form, enrollmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFormOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--id-text)]">Challenge Journal</h3>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">
            Record each trade manually. Statistics update after administrator approval.
          </p>
        </div>
        {canSubmit && (
          <Button
            size="sm"
            className="rounded-xl bg-[var(--id-accent)] text-white hover:opacity-90"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Trade
          </Button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--id-text)]">
              {editingId ? "Edit & Resubmit Trade" : "New Trade Entry"}
            </h4>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-[var(--id-text-muted)] hover:text-[var(--id-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Trading Day">
              <Input
                type="number"
                min={1}
                value={form.tradingDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tradingDay: Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.tradeDate}
                onChange={(e) => setForm((f) => ({ ...f, tradeDate: e.target.value }))}
              />
            </Field>
            <Field label="Asset / Instrument">
              <Input
                value={form.instrument}
                onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
                placeholder="e.g. XAU/USD"
              />
            </Field>
            <Field label="Market">
              <Input
                value={form.market}
                onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
                placeholder="Forex"
              />
            </Field>
            <Field label="Direction">
              <Select
                value={form.direction}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    direction: v as CreateChallengeTradeInput["direction"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lot Size">
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={form.lotSize}
                onChange={(e) => setForm((f) => ({ ...f, lotSize: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Entry Price">
              <Input
                type="number"
                step="0.00001"
                value={form.entryPrice}
                onChange={(e) => setForm((f) => ({ ...f, entryPrice: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Exit Price">
              <Input
                type="number"
                step="0.00001"
                value={form.exitPrice}
                onChange={(e) => setForm((f) => ({ ...f, exitPrice: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Profit / Loss">
              <Input
                type="number"
                step="0.01"
                value={form.profitLoss}
                onChange={(e) => setForm((f) => ({ ...f, profitLoss: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Trade Notes">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Field>
            <Field label="Screenshot URL (optional)">
              <Input
                value={form.screenshotUrl}
                onChange={(e) => setForm((f) => ({ ...f, screenshotUrl: e.target.value }))}
                placeholder="https://..."
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[var(--id-accent)] text-white">
              {loading ? "Submitting…" : editingId ? "Resubmit Trade" : "Submit for Review"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--id-border)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--id-surface-elevated)] text-left text-[11px] uppercase tracking-wider text-[var(--id-text-muted)]">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Instrument</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">P/L</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--id-text-muted)]">
                    No trades recorded yet.
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-t border-[var(--id-border)] bg-[var(--id-surface-muted)]"
                  >
                    <td className="px-4 py-3 tabular-nums">{trade.tradingDay}</td>
                    <td className="px-4 py-3 tabular-nums">{trade.tradeDate}</td>
                    <td className="px-4 py-3 font-medium">{trade.instrument}</td>
                    <td className="px-4 py-3 capitalize">{trade.direction}</td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums font-medium",
                        trade.profitLoss >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatCurrency(trade.profitLoss)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={trade.status} />
                    </td>
                    <td className="px-4 py-3">
                      {trade.status === CHALLENGE_TRADE_STATUS.REJECTED && canSubmit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(trade)}
                          className="h-8 px-2"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {trades.some((t) => t.rejectionReason) && (
        <div className="space-y-2">
          {trades
            .filter((t) => t.rejectionReason)
            .map((trade) => (
              <div
                key={`reject-${trade.id}`}
                className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm"
              >
                <p className="font-medium text-rose-400">
                  {trade.instrument} — rejected
                </p>
                <p className="mt-1 text-[var(--id-text-secondary)]">{trade.rejectionReason}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_review: "bg-amber-500/10 text-amber-400",
    approved: "bg-emerald-500/10 text-emerald-400",
    rejected: "bg-rose-500/10 text-rose-400",
  };
  const labels: Record<string, string> = {
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
        styles[status] ?? "bg-[var(--id-surface-elevated)] text-[var(--id-text-muted)]"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
