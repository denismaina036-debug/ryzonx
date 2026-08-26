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
        title="Recent Pool Trades"
        description="Recent trades recorded by the pools you have invested in."
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
        title="No recent pool trades yet"
        description="Trades will appear here after a pool you have invested in records investor-visible activity."
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
