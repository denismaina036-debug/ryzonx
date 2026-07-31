import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import type { PublicPoolTradeView } from "@/domain/trading-journal/types";

export interface PoolActivityCycleSummary {
  id: string;
  cycleNumber: number;
  name: string;
  status: InvestmentCycleStatus;
  tradeCount: number;
  cycleProfit: number;
}

export interface PoolActivityPageData {
  poolId: string;
  poolSlug: string;
  poolName: string;
  displayPoolName: string;
  activeCycle: PoolActivityCycleSummary | null;
  currentCycleTrades: PublicPoolTradeView[];
  cycles: PoolActivityCycleSummary[];
  journalTrades: PublicPoolTradeView[];
}
