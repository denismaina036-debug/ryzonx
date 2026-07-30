"use client";

import { Input } from "@/components/ui/input";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { pmInputClass } from "@/features/pool-manager/constants/ui";
import { RoiDisclaimerInline } from "@/features/roi/components/live-roi-preview";
import type { PlatformInvestmentLevel } from "@/domain/roi";

export interface RoiMultiplierEntry {
  investmentLevelId: string;
  multiplier: string;
}

interface PmRoiMultiplierEditorProps {
  levels: PlatformInvestmentLevel[];
  multipliers: RoiMultiplierEntry[];
  onChange: (multipliers: RoiMultiplierEntry[]) => void;
  disabled?: boolean;
}

export function PmRoiMultiplierEditor({
  levels,
  multipliers,
  onChange,
  disabled = false,
}: PmRoiMultiplierEditorProps) {
  function updateMultiplier(levelId: string, value: string) {
    const existing = multipliers.find((m) => m.investmentLevelId === levelId);
    if (existing) {
      onChange(
        multipliers.map((m) =>
          m.investmentLevelId === levelId ? { ...m, multiplier: value } : m
        )
      );
    } else {
      onChange([...multipliers, { investmentLevelId: levelId, multiplier: value }]);
    }
  }

  function getMultiplier(levelId: string): string {
    return multipliers.find((m) => m.investmentLevelId === levelId)?.multiplier ?? "";
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--id-text-muted)]">
        Set the projected ROI multiplier for each platform investment level. This is the return
        target investors will see — not a guaranteed payout.
      </p>

      <div className="overflow-hidden rounded-xl border border-[var(--id-border)]">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
          <span>Investment Level</span>
          <span className="w-28 text-right">Multiplier</span>
        </div>
        {levels.map((level) => (
          <div
            key={level.id}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--id-border)] last:border-b-0 px-4 py-3"
          >
            <div>
              <p className="font-medium text-[var(--id-text)]">{level.name}</p>
              <p className="text-xs text-[var(--id-text-muted)]">
                {formatLevelRangeStatic(level)}
              </p>
            </div>
            <div className="flex w-28 items-center gap-1">
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={getMultiplier(level.id)}
                onChange={(e) => updateMultiplier(level.id, e.target.value)}
                disabled={disabled}
                className={`${pmInputClass} text-right tabular-nums`}
                placeholder="2.00"
              />
              <span className="text-sm text-[var(--id-text-muted)]">×</span>
            </div>
          </div>
        ))}
      </div>

      <RoiDisclaimerInline />
    </div>
  );
}

function formatLevelRangeStatic(level: PlatformInvestmentLevel): string {
  const min = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(level.minAmount);
  if (level.maxAmount == null) return `Above ${min}`;
  const max = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(level.maxAmount);
  return `${min} - ${max}`;
}

/** Build default multiplier entries from platform levels. */
export function defaultRoiMultipliers(
  levels: PlatformInvestmentLevel[]
): RoiMultiplierEntry[] {
  const defaults = [2.0, 2.3, 2.5];
  return levels.map((level, i) => ({
    investmentLevelId: level.id,
    multiplier: String(defaults[i] ?? 2.0),
  }));
}

/** Client-safe formatter — mirrors service method. */
export { formatLevelRangeStatic as formatInvestmentLevelRange };
