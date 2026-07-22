"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReturnTier } from "@/features/investor/types/account";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { pmInputClass } from "@/features/pool-manager/constants/ui";

interface PmVariableReturnEditorProps {
  tiers: ReturnTier[];
  investorSharePct: string;
  poolManagerSharePct: string;
  onTiersChange: (tiers: ReturnTier[]) => void;
  onInvestorShareChange: (value: string) => void;
  onPoolManagerShareChange: (value: string) => void;
  disabled?: boolean;
}

export function PmVariableReturnEditor({
  tiers,
  investorSharePct,
  poolManagerSharePct,
  onTiersChange,
  onInvestorShareChange,
  onPoolManagerShareChange,
  disabled,
}: PmVariableReturnEditorProps) {
  function updateTier(index: number, patch: Partial<ReturnTier>) {
    onTiersChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? (last.maxAmount ?? last.minAmount) + 1 : 100;
    onTiersChange([...tiers, { minAmount: nextMin, maxAmount: null, returnPct: 10 }]);
  }

  function removeTier(index: number) {
    onTiersChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-[var(--id-surface-muted)]/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--id-text)]">Investment Tier Table</p>
          <Button type="button" size="sm" variant="outline" onClick={addTier} disabled={disabled}>
            <Plus className="h-3.5 w-3.5" />
            Add tier
          </Button>
        </div>
        <p className="mb-4 text-xs text-[var(--id-text-muted)]">
          Expected Return % is shown to investors. Settlement uses the profit split below and each
          investor&apos;s share of target capital.
        </p>

        <div className="mb-2 hidden gap-2 text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)] sm:grid sm:grid-cols-[1fr_1fr_1fr_auto]">
          <span>Minimum Investment</span>
          <span>Maximum Investment</span>
          <span>Expected Return %</span>
          <span className="w-10" />
        </div>

        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Input
                type="number"
                placeholder="Min $"
                value={tier.minAmount}
                disabled={disabled}
                min={1}
                onChange={(e) =>
                  updateTier(index, { minAmount: Number(e.target.value) || 0 })
                }
                className={pmInputClass}
              />
              <Input
                type="number"
                placeholder="Max $ (empty = unlimited)"
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
                min={0}
                step="0.1"
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

      <div className="rounded-lg border border-border bg-[var(--id-surface-muted)]/40 p-4">
        <p className="mb-4 text-sm font-medium text-[var(--id-text)]">Profit Split</p>
        <p className="mb-4 text-xs text-[var(--id-text-muted)]">
          After the 2.5% platform fee, distributable profit is split between investors and the Pool
          Manager. The investor portion is allocated by each investor&apos;s share of target capital.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <PmFormField label="Investor Share (%)" required>
            <Input
              type="number"
              min={1}
              max={99}
              value={investorSharePct}
              onChange={(e) => onInvestorShareChange(e.target.value)}
              disabled={disabled}
              className={pmInputClass}
            />
          </PmFormField>
          <PmFormField label="Pool Manager Share (%)" required>
            <Input
              type="number"
              min={1}
              max={99}
              value={poolManagerSharePct}
              onChange={(e) => onPoolManagerShareChange(e.target.value)}
              disabled={disabled}
              className={pmInputClass}
            />
          </PmFormField>
        </div>
      </div>
    </div>
  );
}
