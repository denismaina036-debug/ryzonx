import type { TradeJournalStatus } from "@/constants/trading-journal";
import type { TradeEntryDirection, TradeEntryStatus } from "@/constants/trade-entry";
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
  notes: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  timeline: Array<{ label: string; occurredAt: string; description?: string | null }>;
  journalSummary: {
    openPositionsCount: number;
    closedPositionsCount: number;
    totalTrades: number;
    lastSnapshotAt: string | null;
  };
  portfolioProgress: {
    raisedCapital: number;
    targetCapital: number | null;
    remainingCapital?: number | null;
    fundingProgressPct?: number | null;
    investorCount: number;
    cycleStatus: string;
  };
}

export interface CreateTradeEntryInput {
  instrument: string;
  market?: string | null;
  direction: TradeEntryDirection;
  entryPrice: number;
  quantity: number;
  notes?: string | null;
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
  notes?: string | null;
}
