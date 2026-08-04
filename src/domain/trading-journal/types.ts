import type { TradeJournalStatus } from "@/constants/trading-journal";
import type { TradeEntryDirection, TradeEntryResult, TradeEntryStatus } from "@/constants/trade-entry";
import type { CycleProgressPhase, CycleProgressEventType } from "@/constants/cycle-progress";

export interface TradeJournal {
  id: string;
  investmentCycleId: string;
  poolManagerId: string;
  strategyId: string;
  status: TradeJournalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TradeEntry {
  id: string;
  journalId: string;
  investmentCycleId: string;
  poolManagerId: string;
  tradeReference: string;
  instrument: string;
  market: string | null;
  direction: TradeEntryDirection;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  status: TradeEntryStatus;
  tradeResult: TradeEntryResult | null;
  realizedPnl: number | null;
  lossAppliedAt: string | null;
  profitAppliedAt: string | null;
  screenshotUrl: string | null;
  investorVisible: boolean;
  notes: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Minimal trade card for investor-facing journal feeds. */
export interface PublicTradeEntryView {
  id: string;
  tradeReference: string;
  instrument: string;
  direction: TradeEntryDirection;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  tradeResult: TradeEntryResult | null;
  realizedPnl: number | null;
  screenshotUrl: string | null;
  closedAt: string | null;
}

/** Public pool journal trade — includes cycle context for grouping. */
export interface PublicPoolTradeView extends PublicTradeEntryView {
  investmentCycleId: string;
  cycleNumber: number;
  cycleName: string;
  cycleStatus: string;
}

export interface TradeSnapshot {
  id: string;
  journalId: string;
  investmentCycleId: string;
  poolManagerId: string;
  snapshotAt: string;
  openPositionsCount: number;
  closedPositionsCount: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageHoldingHours: number | null;
  currentExposure: number | null;
  metrics: Record<string, unknown>;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CycleProgressEvent {
  id: string;
  investmentCycleId: string;
  phase: CycleProgressPhase;
  eventType: CycleProgressEventType;
  label: string;
  description: string | null;
  metadata: Record<string, unknown>;
  actorId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface OperationalMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  openPositions: number;
  closedPositions: number;
  averageHoldingHours: number | null;
  currentExposure: number;
}

export interface CycleProgressSummary {
  currentPhase: CycleProgressPhase;
  tradingStatus: string;
  timeline: CycleProgressEvent[];
  metrics: OperationalMetrics;
}

export interface InvestorCycleOperationsView {
  tradingStatus: string;
  currentPhase: CycleProgressPhase;
  phaseLabel: string;
  simplifiedPhase: "funding" | "trading";
  simplifiedPhaseLabel: string;
  timeline: Array<{ label: string; occurredAt: string; description?: string | null }>;
  journalSummary: {
    openPositionsCount: number;
    closedPositionsCount: number;
    totalTrades: number;
    lastSnapshotAt: string | null;
  };
  publicTrades: PublicTradeEntryView[];
  portfolioProgress: {
    raisedCapital: number;
    targetCapital: number | null;
    remainingCapital?: number | null;
    fundingProgressPct?: number | null;
    investorCount: number;
    cycleStatus: string;
    fundingStartedAt?: string | null;
  };
  liveTrading?: {
    currentCycleProfit: number;
    tradesRecorded: number;
    investorInvestment: number | null;
    investorOwnershipPct: number | null;
    investorProjectedProfit: number | null;
  };
}

export interface CreateTradeEntryInput {
  instrument: string;
  market?: string | null;
  direction?: TradeEntryDirection;
  entryPrice?: number;
  quantity?: number;
  notes?: string | null;
  /** Dollar P/L amount (positive). Used with tradeResult for one-step journal entries. */
  amountUsd?: number;
  /** When set, records a completed trade in one step (entry + exit + P/L). */
  exitPrice?: number;
  tradeResult?: TradeEntryResult | null;
  screenshotUrl?: string | null;
}

export interface UpdateTradeEntryInput {
  instrument?: string;
  market?: string | null;
  direction?: TradeEntryDirection;
  entryPrice?: number;
  quantity?: number;
  notes?: string | null;
}

export interface CloseTradeEntryInput {
  exitPrice: number;
  /** When set, bypasses price×quantity P/L calculation (dollar journal entries). */
  realizedPnlUsd?: number;
  tradeResult?: TradeEntryResult | null;
  notes?: string | null;
  screenshotUrl?: string | null;
}
