import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { AGGRESSIVENESS_LABELS, CAPACITY_STATUS_LABELS } from "@/constants/marketplace";
import { MANAGED_POOL_RETURN_MODEL_LABELS, type ManagedPoolReturnModel } from "@/domain/pools/return-model";
import { formatPayoutDurationLabel } from "@/domain/pools/payout-duration";
import { formatInstrumentTicker } from "@/domain/reference-data/instrument-display";

export function formatRaisedCapitalPct(raised: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((raised / target) * 10000) / 100;
}

export function formatReturnStructureLabel(
  returnModel: ManagedPoolReturnModel,
  investorSharePct: number,
  poolManagerSharePct: number
): string {
  if (returnModel === "fixed") {
    return MANAGED_POOL_RETURN_MODEL_LABELS.fixed;
  }
  return `${Math.round(investorSharePct)}% / ${Math.round(poolManagerSharePct)}%`;
}

export function formatExpectedDurationLabel(
  durationDays: number | null,
  durationUnit: string | null | undefined,
  payoutDurationPreset?: string | null
): string {
  return formatPayoutDurationLabel({
    payoutDurationPreset,
    durationDays,
    durationUnit,
  });
}

export { formatPayoutDurationLabel };

export function formatRiskLevelTag(aggressivenessLevel: string | null | undefined): string | null {
  if (!aggressivenessLevel) return null;
  const label = AGGRESSIVENESS_LABELS[aggressivenessLevel] ?? aggressivenessLevel;
  return `${label} Risk`;
}

export function formatPoolLevelLabel(capacityStatus: string): string {
  return CAPACITY_STATUS_LABELS[capacityStatus] ?? capacityStatus;
}

export function formatCycleStatusLabel(status: InvestmentCycleStatus | null | undefined): string {
  if (!status) return "—";
  return INVESTMENT_CYCLE_STATUS_LABELS[status] ?? status;
}

export function resolveTradingAssetLabel(input: {
  tradingInstrumentCode?: string | null;
  tradingPair?: string | null;
}): string {
  const ticker = formatInstrumentTicker(
    input.tradingInstrumentCode ?? input.tradingPair,
    null
  );
  if (ticker !== "—") return ticker;

  const pair = input.tradingPair?.trim();
  if (pair && pair !== "Multi-asset") {
    return formatInstrumentTicker(pair, pair);
  }

  return "—";
}

export function participantIndicatorCount(participantCount: number): number {
  return Math.min(Math.max(participantCount, 0), 5);
}

/** Remove leading instrument symbol from pool name for public display. */
export function stripInstrumentFromPoolName(
  name: string,
  instrumentCode?: string | null
): string {
  const trimmed = name.trim();
  if (!instrumentCode?.trim()) return trimmed;

  const code = instrumentCode.trim().toUpperCase();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith(code)) {
    return trimmed.slice(code.length).trim().replace(/^[-–—:\s]+/, "") || trimmed;
  }
  return trimmed;
}

/** Admin seed baseline — live platform counts take over once they exceed the seed. */
export function resolvePublicDisplayCount(seed: number, live: number): number {
  return Math.max(seed, live);
}
