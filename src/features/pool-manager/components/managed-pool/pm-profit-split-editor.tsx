"use client";

import { Input } from "@/components/ui/input";
import type { CycleProfitSplit } from "@/domain/investment/profit-split";
import type { PlatformInvestmentLevel } from "@/domain/roi/types";
import { pmInputClass } from "@/features/pool-manager/constants/ui";
import { formatInvestmentLevelRange } from "./pm-roi-multiplier-editor";

export interface ProfitSplitEntry {
  investmentLevelId: string;
  traderPct: string;
  copierPct: string;
}

export function defaultProfitSplitEntries(
  levels: Pick<PlatformInvestmentLevel, "id">[]
): ProfitSplitEntry[] {
  return levels.map((level) => ({
    investmentLevelId: level.id,
    traderPct: "50",
    copierPct: "50",
  }));
}

export function profitSplitEntriesFromSnapshot(splits: CycleProfitSplit[]): ProfitSplitEntry[] {
  return splits.map((split) => ({
    investmentLevelId: split.investmentLevelId,
    traderPct: String(split.traderPct),
    copierPct: String(split.copierPct),
  }));
}

export function parseProfitSplitEntries(entries: ProfitSplitEntry[]): CycleProfitSplit[] {
  return entries.map((entry) => ({
    investmentLevelId: entry.investmentLevelId,
    traderPct: Number(entry.traderPct),
    copierPct: Number(entry.copierPct),
  }));
}

export function PmProfitSplitEditor({
  levels,
  splits,
  onChange,
  disabled = false,
}: {
  levels: PlatformInvestmentLevel[];
  splits: ProfitSplitEntry[];
  onChange: (splits: ProfitSplitEntry[]) => void;
  disabled?: boolean;
}) {
  function current(levelId: string): ProfitSplitEntry {
    return splits.find((split) => split.investmentLevelId === levelId) ?? {
      investmentLevelId: levelId,
      traderPct: "50",
      copierPct: "50",
    };
  }

  function update(levelId: string, side: "traderPct" | "copierPct", value: string) {
    const existing = current(levelId);
    const numeric = Number(value);
    const opposite = side === "traderPct" ? "copierPct" : "traderPct";
    const next = {
      ...existing,
      [side]: value,
      ...(value.trim() && Number.isFinite(numeric) && numeric >= 0 && numeric <= 100
        ? { [opposite]: String(100 - numeric) }
        : {}),
    };
    const hasEntry = splits.some((split) => split.investmentLevelId === levelId);
    onChange(
      hasEntry
        ? splits.map((split) => (split.investmentLevelId === levelId ? next : split))
        : [...splits, next]
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--id-text-muted)]">
        Display-only terms shown to copiers. These percentages do not change ownership,
        projected returns, wallets, or profit distribution.
      </p>
      <div className="overflow-hidden rounded-xl border border-[var(--id-border)]">
        <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] gap-3 border-b border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
          <span>Copy tier</span>
          <span className="text-right">Trader</span>
          <span className="text-right">Copier</span>
        </div>
        {levels.map((level) => {
          const split = current(level.id);
          return (
            <div
              key={level.id}
              className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-3 border-b border-[var(--id-border)] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--id-text)]">{level.name}</p>
                <p className="text-xs text-[var(--id-text-muted)]">{formatInvestmentLevelRange(level)}</p>
              </div>
              <PercentInput
                value={split.traderPct}
                onChange={(value) => update(level.id, "traderPct", value)}
                disabled={disabled}
                label={`${level.name} trader percentage`}
              />
              <PercentInput
                value={split.copierPct}
                onChange={(value) => update(level.id, "copierPct", value)}
                disabled={disabled}
                label={`${level.name} copier percentage`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        step={0.01}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        className={`${pmInputClass} text-right tabular-nums`}
      />
      <span className="text-sm text-[var(--id-text-muted)]">%</span>
    </div>
  );
}
