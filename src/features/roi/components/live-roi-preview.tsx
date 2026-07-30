"use client";

import { useMemo } from "react";
import { TrendingUp, Clock, Layers, Info } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  buildRoiPreview,
  formatMultiplier,
  type PlatformInvestmentLevel,
  type PoolRoiMultiplier,
  type ReturnDurationPreset,
  type ReturnDurationUnit,
  ROI_DISCLAIMER_SHORT,
} from "@/domain/roi";

interface LiveRoiPreviewProps {
  amount: number;
  levels: PlatformInvestmentLevel[];
  multipliers: PoolRoiMultiplier[];
  returnDurationPreset: ReturnDurationPreset;
  returnDurationValue: number;
  returnDurationUnit: ReturnDurationUnit;
  className?: string;
  compact?: boolean;
}

export function LiveRoiPreview({
  amount,
  levels,
  multipliers,
  returnDurationPreset,
  returnDurationValue,
  returnDurationUnit,
  className,
  compact = false,
}: LiveRoiPreviewProps) {
  const preview = useMemo(
    () =>
      buildRoiPreview({
        amount,
        levels,
        multipliers,
        returnDurationPreset,
        returnDurationValue,
        returnDurationUnit,
      }),
    [amount, levels, multipliers, returnDurationPreset, returnDurationValue, returnDurationUnit]
  );

  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const hasMatch = preview.investmentLevel != null && preview.multiplier != null;

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[var(--id-border)] bg-gradient-to-br from-[var(--id-surface)] to-[var(--id-surface-muted)] p-4",
          className
        )}
      >
        {hasValidAmount && hasMatch ? (
          <div className="grid grid-cols-2 gap-3">
            <PreviewStat label="Projected ROI" value={formatMultiplier(preview.multiplier)} accent />
            <PreviewStat label="Expected Payout" value={formatCurrency(preview.projectedPayout ?? 0)} accent />
            <PreviewStat label="Expected Duration" value={preview.returnDurationLabel} />
            <PreviewStat label="Investment Level" value={preview.investmentLevel?.name ?? "—"} />
          </div>
        ) : (
          <p className="text-sm text-[var(--id-text-muted)]">
            {hasValidAmount
              ? "Amount does not match any investment level."
              : "Enter an amount to see projected returns."}
          </p>
        )}
        <RoiDisclaimerInline />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--id-accent)]/20 bg-gradient-to-br from-[var(--id-accent-soft)]/40 via-[var(--id-surface)] to-[var(--id-surface-muted)]",
        className
      )}
    >
      <div className="border-b border-[var(--id-border)]/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--id-accent)]" aria-hidden />
          <h3 className="text-sm font-semibold text-[var(--id-text)]">Projected Return Preview</h3>
        </div>
      </div>

      <div className="p-5">
        {hasValidAmount && hasMatch ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
                  Expected Payout
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--id-text)]">
                  {formatCurrency(preview.projectedPayout ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
                  Projected ROI
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--id-accent-text)]">
                  {formatMultiplier(preview.multiplier)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={Clock}
                label="Expected Duration"
                value={preview.returnDurationLabel}
              />
              <MetricCard
                icon={Layers}
                label="Investment Level"
                value={preview.investmentLevel?.name ?? "—"}
              />
            </div>

            <div className="rounded-lg bg-[var(--id-surface-muted)] px-3 py-2">
              <p className="text-xs text-[var(--id-text-muted)]">
                Investment:{" "}
                <span className="font-semibold text-[var(--id-text)]">
                  {formatCurrency(amount)}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--id-text-muted)]">
              {hasValidAmount
                ? "This amount does not fall within any platform investment level."
                : "Enter an investment amount to preview projected returns."}
            </p>
          </div>
        )}

        <RoiDisclaimerInline className="mt-4" />
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-bold tabular-nums",
          accent ? "text-[var(--id-accent-text)]" : "text-[var(--id-text)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[var(--id-text-muted)]" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-1 text-sm font-semibold text-[var(--id-text)]">{value}</p>
    </div>
  );
}

export function RoiDisclaimerInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--id-text-muted)]" aria-hidden />
      <p className="text-[11px] leading-relaxed text-[var(--id-text-muted)]">{ROI_DISCLAIMER_SHORT}</p>
    </div>
  );
}

export function RoiDisclaimerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p className="text-xs leading-relaxed text-[var(--id-text-secondary)]">
          {ROI_DISCLAIMER_SHORT}
        </p>
      </div>
    </div>
  );
}
