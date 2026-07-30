"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlatformInvestmentLevel } from "@/domain/roi";

export function AdminInvestmentLevelsManager() {
  const [levels, setLevels] = useState<PlatformInvestmentLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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

  function updateLevel(id: string, patch: Partial<PlatformInvestmentLevel>) {
    setLevels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading investment levels…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Platform Investment Levels</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Global investment tiers inherited by every pool. Pool Managers configure ROI multipliers
          per level but cannot modify these ranges.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_120px_120px_80px_80px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Name</span>
          <span>Min Amount</span>
          <span>Max Amount</span>
          <span>Order</span>
          <span />
        </div>
        {levels.map((level) => (
          <div
            key={level.id}
            className="grid grid-cols-[1fr_120px_120px_80px_80px] items-center gap-3 border-b px-4 py-3 last:border-b-0"
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
            <Button
              size="sm"
              disabled={saving === level.id}
              onClick={() => void saveLevel(level)}
            >
              {saving === level.id ? "…" : "Save"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
