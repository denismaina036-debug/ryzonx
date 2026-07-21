import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { AGGRESSIVENESS_LABELS, CAPACITY_STATUS_LABELS } from "@/constants/marketplace";
import { MANAGED_POOL_RETURN_MODEL_LABELS, type ManagedPoolReturnModel } from "@/domain/pools/return-model";
import {
  computeFundingCountdown,
  formatFundingCountdownLabel,
} from "@/features/marketplace/utils/funding-countdown";

export function formatCardFundingCountdown(
  fundingPeriodEndsAt: string | null,
  cycleStatus: InvestmentCycleStatus | null | undefined
): string | null {
  if (cycleStatus !== "funding" && cycleStatus !== "approved") return null;
  const parts = computeFundingCountdown(fundingPeriodEndsAt);
  if (!parts) return null;
  return formatFundingCountdownLabel(parts);
}

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
  durationUnit: string | null | undefined
): string {
  if (durationDays == null || durationDays <= 0) return "—";
  const unit = durationUnit ?? "days";
  const value = Math.round(durationDays);
  if (unit === "weeks") return value === 1 ? "1 Week" : `${value} Weeks`;
  if (unit === "hours") return value === 1 ? "1 Hour" : `${value} Hours`;
  return value === 1 ? "1 Day" : `${value} Days`;
}

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
  marketsTraded?: string[];
}): string {
  if (input.tradingInstrumentCode?.trim()) return input.tradingInstrumentCode.trim();
  if (input.tradingPair?.trim() && input.tradingPair !== "Multi-asset") return input.tradingPair.trim();
  const market = input.marketsTraded?.[0];
  return market?.trim() || "—";
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
