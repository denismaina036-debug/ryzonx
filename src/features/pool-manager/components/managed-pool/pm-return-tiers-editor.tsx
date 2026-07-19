"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReturnTier } from "@/features/investor/types/account";
import { pmInputClass } from "@/features/pool-manager/constants/ui";

interface PmReturnTiersEditorProps {
  tiers: ReturnTier[];
  onChange: (tiers: ReturnTier[]) => void;
  disabled?: boolean;
}

export function PmReturnTiersEditor({ tiers, onChange, disabled }: PmReturnTiersEditorProps) {
  function updateTier(index: number, patch: Partial<ReturnTier>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? (last.maxAmount ?? last.minAmount) + 1 : 100;
    onChange([...tiers, { minAmount: nextMin, maxAmount: null, returnPct: 10 }]);
  }

  function removeTier(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-lg border border-border bg-[var(--id-surface-muted)]/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--id-text)]">Return by Investment Amount</p>
        <Button type="button" size="sm" variant="outline" onClick={addTier} disabled={disabled}>
          <Plus className="h-3.5 w-3.5" />
          Add tier
        </Button>
      </div>
      <div className="space-y-2">
        {tiers.map((tier, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              type="number"
              placeholder="Min $"
              value={tier.minAmount}
              disabled={disabled}
              onChange={(e) =>
                updateTier(index, { minAmount: Number(e.target.value) || 0 })
              }
              className={pmInputClass}
            />
            <Input
              type="number"
              placeholder="Max $ (empty = no cap)"
              value={tier.maxAmount ?? ""}
              disabled={disabled}
              onChange={(e) =>
                updateTier(index, {
                  maxAmount: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={pmInputClass}
            />
            <Input
              type="number"
              placeholder="Return %"
              value={tier.returnPct}
              disabled={disabled}
              onChange={(e) =>
                updateTier(index, { returnPct: Number(e.target.value) || 0 })
              }
              className={pmInputClass}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || tiers.length <= 1}
              onClick={() => removeTier(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
