"use client";

import { TrendingUp } from "lucide-react";
import { InvestorTradeCard } from "@/features/investor/components/investor-trade-card";
import { RyvonxEmptyState, RyvonxPageHeader } from "@/features/investor/constants/ui";
import type { InvestorDashboardTrade } from "@/features/investor/types";

export interface InvestorTradesPageData {
  recentTrades: InvestorDashboardTrade[];
}

interface InvestorTradesViewProps {
  data: InvestorTradesPageData;
}

export function InvestorTradesView({ data }: InvestorTradesViewProps) {
  const { recentTrades } = data;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[960px] space-y-6">
      <RyvonxPageHeader
        title="Recent Strategy Trades"
        description="Recent trades from the traders you copy."
      />

      <TradesList trades={recentTrades} />
    </div>
  );
}

function TradesList({ trades }: { trades: InvestorDashboardTrade[] }) {
  if (trades.length === 0) {
    return (
      <RyvonxEmptyState
        icon={<TrendingUp className="h-5 w-5" />}
        title="No recent strategy trades yet"
        description="Trades will appear here when a trader you copy publishes new activity."
      />
    );
  }

  return (
    <div className="space-y-3">
      {trades.map((trade) => (
        <InvestorTradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}
