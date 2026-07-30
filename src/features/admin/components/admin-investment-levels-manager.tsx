"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import {
  buildRoiPreview,
  formatMultiplier,
} from "@/domain/roi/calculator";

const PREVIEW_AMOUNTS = [100, 750, 1000, 1001, 3500, 5000, 5001, 10000];

export function AdminInvestmentLevelsManager() {
  const [levels, setLevels] = useState<PlatformInvestmentLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLevel, setNewLevel] = useState({
    name: "",
    minAmount: "100",
    maxAmount: "",
    sortOrder: "99",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/investment-levels");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setLevels(data.levels ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load investment levels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.sortOrder - b.sortOrder),
    [levels]
  );

  async function saveLevel(level: PlatformInvestmentLevel) {
    setSaving(level.id);
    try {
      const res = await fetch(`/api/admin/investment-levels/${level.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: level.name,
          minAmount: level.minAmount,
          maxAmount: level.maxAmount,
          sortOrder: level.sortOrder,
          isActive: level.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(`Updated ${level.name}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function createLevel() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/investment-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLevel.name.trim(),
          minAmount: Number(newLevel.minAmount),
          maxAmount: newLevel.maxAmount ? Number(newLevel.maxAmount) : null,
          sortOrder: Number(newLevel.sortOrder),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      toast.success(`Created ${newLevel.name}`);
      setNewLevel({ name: "", minAmount: "100", maxAmount: "", sortOrder: "99" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function deleteLevel(level: PlatformInvestmentLevel) {
    if (!confirm(`Remove "${level.name}"? Existing pool multipliers referencing this level remain until updated.`)) {
      return;
    }
    setSaving(level.id);
    try {
      const res = await fetch(`/api/admin/investment-levels/${level.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      toast.success(`Removed ${level.name}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(null);
    }
  }

  function updateLevel(id: string, patch: Partial<PlatformInvestmentLevel>) {
    setLevels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function moveLevel(level: PlatformInvestmentLevel, direction: "up" | "down") {
    const index = sortedLevels.findIndex((l) => l.id === level.id);
    const swapWith = direction === "up" ? sortedLevels[index - 1] : sortedLevels[index + 1];
    if (!swapWith) return;

    updateLevel(level.id, { sortOrder: swapWith.sortOrder });
    updateLevel(swapWith.id, { sortOrder: level.sortOrder });

    await Promise.all([
      saveLevel({ ...level, sortOrder: swapWith.sortOrder }),
      saveLevel({ ...swapWith, sortOrder: level.sortOrder }),
    ]);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading investment levels…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Platform Investment Levels</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Global investment tiers inherited by every pool. Pool Managers configure ROI multipliers
          per level but cannot modify these ranges.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_120px_120px_72px_140px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Name</span>
          <span>Min Amount</span>
          <span>Max Amount</span>
          <span>Order</span>
          <span>Actions</span>
        </div>
        {sortedLevels.map((level, index) => (
          <div
            key={level.id}
            className="grid grid-cols-[1fr_120px_120px_72px_140px] items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <Input
              value={level.name}
              onChange={(e) => updateLevel(level.id, { name: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              value={level.minAmount}
              onChange={(e) =>
                updateLevel(level.id, { minAmount: Number(e.target.value) })
              }
            />
            <Input
              type="number"
              min={0}
              placeholder="No max"
              value={level.maxAmount ?? ""}
              onChange={(e) =>
                updateLevel(level.id, {
                  maxAmount: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Input
              type="number"
              min={0}
              value={level.sortOrder}
              onChange={(e) =>
                updateLevel(level.id, { sortOrder: Number(e.target.value) })
              }
            />
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={index === 0 || saving === level.id}
                onClick={() => void moveLevel(level, "up")}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={index === sortedLevels.length - 1 || saving === level.id}
                onClick={() => void moveLevel(level, "down")}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                disabled={saving === level.id}
                onClick={() => void saveLevel(level)}
              >
                {saving === level.id ? "…" : "Save"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={saving === level.id}
                onClick={() => void deleteLevel(level)}
                aria-label="Delete level"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold">Add Investment Level</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_120px_72px_auto]">
          <Input
            placeholder="Level name"
            value={newLevel.name}
            onChange={(e) => setNewLevel((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Min"
            value={newLevel.minAmount}
            onChange={(e) => setNewLevel((prev) => ({ ...prev, minAmount: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Max (optional)"
            value={newLevel.maxAmount}
            onChange={(e) => setNewLevel((prev) => ({ ...prev, maxAmount: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Order"
            value={newLevel.sortOrder}
            onChange={(e) => setNewLevel((prev) => ({ ...prev, sortOrder: e.target.value }))}
          />
          <Button disabled={creating || !newLevel.name.trim()} onClick={() => void createLevel()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold">Impact Preview</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Example payouts at default multipliers (2.0× / 2.3× / 2.5×). Actual pool targets are set
          by Pool Managers.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">Multiplier</th>
                <th className="py-2">Projected Payout</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_AMOUNTS.map((amount) => {
                const defaultMultipliers = sortedLevels.map((level, index) => ({
                  id: level.id,
                  fundId: "preview",
                  investmentLevelId: level.id,
                  multiplier: index === 0 ? 2.0 : index === 1 ? 2.3 : 2.5,
                  level,
                }));
                const preview = buildRoiPreview({
                  amount,
                  levels: sortedLevels,
                  multipliers: defaultMultipliers,
                  returnDurationPreset: "daily",
                  returnDurationValue: 1,
                  returnDurationUnit: "days",
                });
                return (
                  <tr key={amount} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-mono">${amount.toLocaleString()}</td>
                    <td className="py-2 pr-4">{preview.investmentLevel?.name ?? "—"}</td>
                    <td className="py-2 pr-4">{formatMultiplier(preview.multiplier)}</td>
                    <td className="py-2 font-mono">
                      {preview.projectedPayout != null
                        ? `$${preview.projectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
